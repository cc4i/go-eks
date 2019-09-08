import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import eks = require('@aws-cdk/aws-eks');
import autoscaling = require('@aws-cdk/aws-autoscaling');
//import ssm = require('@aws-cdk/aws-ssm');
import iam = require('@aws-cdk/aws-iam');

import { BaseNetwrok } from './base-network';


export interface EksClusterProps {
    baseNetwork: BaseNetwrok;
    clusterName: string;
}

export class EksCluster extends cdk.Construct {

    eksCluster: eks.CfnCluster
    controlPlaneSG: ec2.SecurityGroup

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

        this.controlPlaneSG = new ec2.SecurityGroup(this, `EksControlPlaneSG`, {
            vpc: props.baseNetwork.vpc
        });

        this.eksCluster = new eks.CfnCluster(this,"EksCluster",{
            resourcesVpcConfig: {
                securityGroupIds: [this.controlPlaneSG.securityGroupId],
                subnetIds: [
                    props.baseNetwork.vpc.publicSubnets[0].subnetId,
                    props.baseNetwork.vpc.publicSubnets[1].subnetId,
                    props.baseNetwork.vpc.privateSubnets[0].subnetId,
                    props.baseNetwork.vpc.privateSubnets[1].subnetId
                ]
            },
            roleArn: eksRole.roleArn,
            name: props.clusterName
        })

    }



}