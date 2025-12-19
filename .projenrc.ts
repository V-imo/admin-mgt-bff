import { Projalf } from "projalf";
const project = new Projalf({
  cdkVersion: "2.1.0",
  defaultReleaseBranch: "main",
  name: "admin-mgt-bff",
  projenrcTs: true,

  deps: [
    "@aws-lambda-powertools/logger",
    "@aws-lambda-powertools/tracer",

    "@aws-sdk/client-dynamodb",
    "@aws-sdk/client-eventbridge",
    "@aws-sdk/lib-dynamodb",
    "@aws-sdk/util-dynamodb",

    "aws-cdk-lib",
    "aws-lambda",

    "dynamodb-toolbox",
    "zod",
    "hono",
    "@hono/zod-openapi",
    "@hono/swagger-ui",
    "@middy/core",
    "serverless-spy",
    "date-fns",
    "uuid",
    "vimo-events",
  ],
  devDeps: [
    "projalf",
    "@faker-js/faker@8",
    "exponential-backoff",
    "@aws-sdk/client-cognito-identity-provider",
    "@types/aws-lambda",
  ],
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // packageName: undefined,  /* The "name" in package.json. */
});

const task = project.tasks.removeTask("test:e2e")
project.tasks.addTask("test:e2e", {
  exec: 'NODE_OPTIONS="--max-old-space-size=8192 --experimental-vm-modules" ' + task!.steps[0].exec,
  receiveArgs: true,
})

project.synth();
