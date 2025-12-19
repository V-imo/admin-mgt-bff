import * as cdk from "aws-cdk-lib"
import { Construct } from "constructs"

export interface AdminMgtBffProps extends cdk.StackProps {
  serviceName: string;
  stage: string;
}

export class AdminMgtBff extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AdminMgtBffProps) {
    super(scope, id, props)
    // Add your infra here...
  }
}
