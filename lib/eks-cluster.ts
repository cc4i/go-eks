import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import eks = require('@aws-cdk/aws-eks');
import autoscaling = require('@aws-cdk/aws-autoscaling');
//import ssm = require('@aws-cdk/aws-ssm');
import iam = require('@aws-cdk/aws-iam');

import { BaseNetwrok } from './base-network';


export interface EksClusterProps {
    //baseNetwork: BaseNetwrok;
    vpcId: string;
    publicSubne0tId: string;
    publicSubne1tId: string;
    privateSubne0tId: string;
    privateSubne1tId: string;
    controlPlaneSGId: string;
    clusterName: string;
}

export class EksCluster extends cdk.Construct {

    eksCluster: eks.CfnCluster

    constructor(scope: cdk.Construct, id: string, props: EksClusterProps) {
        super(scope, id);

        const eksRole = new iam.Role(this, 'EksServiceRole', {
            assumedBy: new iam.ServicePrincipal('eks.amazonaws.com'),
            managedPolicies: [
                {managedPolicyArn:  "arn:aws:iam::aws:policy/AmazonEKSServicePolicy"},
                {managedPolicyArn: "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"}
            ]
          });

        eksRole.addToPolicy(
            new iam.PolicyStatement({
                actions: ["elasticloadbalancing:*","ec2:CreateSecurityGroup","ec2:Describe*"],
                resources: ["*"]
            })
          );

       

        this.eksCluster = new eks.CfnCluster(this,"EksCluster",{
            resourcesVpcConfig: {
                securityGroupIds: [props.controlPlaneSGId],
                subnetIds: [
                    props.publicSubne0tId,
                    props.publicSubne1tId,
                    props.privateSubne0tId,
                    props.privateSubne1tId
                ]
            },
            roleArn: eksRole.roleArn,
            name: props.clusterName
        })

    }



}