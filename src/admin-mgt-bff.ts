import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as ddb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ln from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as events from "aws-cdk-lib/aws-events";
import * as events_targets from "aws-cdk-lib/aws-events-targets";
import * as levs from "aws-cdk-lib/aws-lambda-event-sources";
import * as apigw from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as apigw_authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { ServerlessSpy } from "serverless-spy";
import { AgencyUpdatedEvent } from "vimo-events";

export interface AdminMgtBffProps extends cdk.StackProps {
  serviceName: string;
  stage: string;
}

export class AdminMgtBff extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AdminMgtBffProps) {
    super(scope, id, props);

    const eventBus = this.getEventBus(props.stage);
    const { userPool, userPoolClient } = this.getAuth(props.stage);

    const table = new ddb.TableV2(this, "AdminMgtBffTable", {
      partitionKey: { name: "PK", type: ddb.AttributeType.STRING },
      sortKey: { name: "SK", type: ddb.AttributeType.STRING },
      dynamoStream: ddb.StreamViewType.NEW_AND_OLD_IMAGES,
      billing: ddb.Billing.onDemand(),
      removalPolicy:
        props.stage === "prod"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
    });

    const listener = new ln.NodejsFunction(this, "Listener", {
      entry: `${__dirname}/functions/listener.ts`,
      environment: {
        STAGE: props.stage,
        SERVICE: props.serviceName,
        TABLE_NAME: table.tableName,
        EVENT_BUS_NAME: eventBus.eventBusName,
      },
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      logRetention: logs.RetentionDays.THREE_DAYS,
      tracing: lambda.Tracing.ACTIVE,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });
    table.grantReadWriteData(listener);
    eventBus.grantPutEventsTo(listener);

    new events.Rule(this, "Rule", {
      eventBus,
      eventPattern: {
        source: ["custom"],
        detailType: [AgencyUpdatedEvent.type],
      },
      targets: [
        new events_targets.LambdaFunction(listener, {
          retryAttempts: 3,
        }),
      ],
    });

    const trigger = new ln.NodejsFunction(this, "Trigger", {
      entry: `${__dirname}/functions/trigger.ts`,
      environment: {
        STAGE: props.stage,
        SERVICE: props.serviceName,
        TABLE_NAME: table.tableName,
        EVENT_BUS_NAME: eventBus.eventBusName,
      },
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      logRetention: logs.RetentionDays.THREE_DAYS,
      tracing: lambda.Tracing.ACTIVE,
      timeout: cdk.Duration.minutes(5),
      memorySize: 128,
      events: [
        new levs.DynamoEventSource(table, {
          startingPosition: lambda.StartingPosition.TRIM_HORIZON,
          retryAttempts: 3,
        }),
      ],
    });
    table.grantReadWriteData(trigger);
    eventBus.grantPutEventsTo(trigger);

    const api = new apigw.HttpApi(this, "AdminMgtBffApi", {
      corsPreflight: {
        allowHeaders: [
          "Content-Type",
          "Authorization",
          "Content-Length",
          "X-Requested-With",
        ],
        allowMethods: [apigw.CorsHttpMethod.ANY],
        allowOrigins: ["*"],
        allowCredentials: false,
      },
    });
    const apiFunction = new ln.NodejsFunction(this, "ApiFunction", {
      entry: `${__dirname}/functions/api/index.ts`,
      environment: {
        STAGE: props.stage,
        SERVICE: props.serviceName,
        NODE_OPTIONS: "--enable-source-maps",
        TABLE_NAME: table.tableName,
      },
      bundling: { minify: true, sourceMap: true },
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      logRetention: logs.RetentionDays.THREE_DAYS,
      tracing: lambda.Tracing.ACTIVE,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });
    table.grantReadWriteData(apiFunction);

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url ?? "",
    });

    const apiIntegration = new integrations.HttpLambdaIntegration(
      "ApiIntegration",
      apiFunction
    );

    const authorizer = new apigw_authorizers.HttpUserPoolAuthorizer(
      `${id}Authorizer`,
      userPool,
      {
        userPoolClients: [userPoolClient],
      }
    );
    api.addRoutes({
      path: "/doc",
      methods: [apigw.HttpMethod.GET],
      integration: apiIntegration,
      authorizer: undefined,
    });
    api.addRoutes({
      path: "/{proxy+}",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.POST,
        apigw.HttpMethod.PATCH,
        apigw.HttpMethod.DELETE,
      ],
      integration: apiIntegration,
      authorizer,
    });

    if (props.stage.startsWith("test")) {
      const serverlessSpy = new ServerlessSpy(this, "ServerlessSpy", {
        generateSpyEventsFileLocation: "test/spy.ts",
      });
      serverlessSpy.spy();
    }
  }

  getEventBus(stage: string) {
    if (stage.startsWith("test")) {
      const eventBus = new events.EventBus(this, "EventBus");
      new cdk.CfnOutput(this, "EventBusName", {
        value: eventBus.eventBusName,
      });
      return eventBus;
    }
    return events.EventBus.fromEventBusArn(
      this,
      "EventBus",
      ssm.StringParameter.valueForStringParameter(
        this,
        `/vimo/${stage}/event-bus-arn`
      )
    );
  }

  getAuth(stage: string) {
    if (stage.startsWith("test")) {
      const userPool = new cognito.UserPool(this, "UserPool", {
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

      new cdk.CfnOutput(this, "UserPoolId", {
        value: userPool.userPoolId,
      });

      const userPoolClient = new cognito.UserPoolClient(
        this,
        "UserPoolClient",
        {
          userPool,
          authFlows: {
            userPassword: true,
          },
        }
      );
      new cdk.CfnOutput(this, "UserPoolClientId", {
        value: userPoolClient.userPoolClientId,
      });

      return { userPool, userPoolClient };
    }
    // User Pool for employee only
    const userPool = new cognito.UserPool(this, "AdminUserPool", {
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      userInvitation: {
        emailSubject: "Welcome to Vimo Admin!",
        emailBody: "Hello {username}, your temporary password is {####}",
      },
      removalPolicy: stage.startsWith("test")
        ? cdk.RemovalPolicy.DESTROY
        : cdk.RemovalPolicy.RETAIN,
    });
    const userPoolClient = userPool.addClient("AdminUserPoolClient", {
      authFlows: { userPassword: true },
      preventUserExistenceErrors: true,
      generateSecret: true,
    });

    return { userPool, userPoolClient };
  }
}
