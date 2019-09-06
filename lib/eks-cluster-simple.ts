import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import eks = require('@aws-cdk/aws-eks');
import autoscaling = require('@aws-cdk/aws-autoscaling');
//import ssm = require('@aws-cdk/aws-ssm');
import iam = require('@aws-cdk/aws-iam');

import { BaseNetwrok } from './base-network';


export interface EksWithSpotProps {
    baseNetwork: BaseNetwrok;
    keyPairEC2: string;
    maxSizeASG: string;
    minSizeASG: string;
    desiredCapacityASG: string;
    cooldownASG: string;
    onDemandPercentage: number;
}

export class EksWithSimple extends cdk.Construct {

    eksCluster: eks.Cluster


    constructor(scope: cdk.Construct, id: string, props: EksWithSpotProps) {
        super(scope, id);

        this.eksCluster = new eks.Cluster(this,"EksCluster", {
            vpc: props.baseNetwork.vpc,
            vpcSubnets: [
                {subnetType: ec2.SubnetType.PRIVATE},
                {subnetType: ec2.SubnetType.PUBLIC}
            ]
        });

    }



}