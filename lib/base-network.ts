import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import { CfnNatGateway } from '@aws-cdk/aws-ec2';
import { SSL_OP_ALL } from 'constants';



export class BaseNetwrok extends cdk.Construct {

    vpc: ec2.Vpc

    constructor(scope: cdk.Construct, id: string) {
        super(scope, id);

        this.vpc = new ec2.Vpc(this, "BaseVpc", {
          cidr: "10.0.0.0/16",
        });
      }

}