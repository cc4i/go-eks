import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import { BaseNetwrok } from './base-network';
import { EksCluster } from './eks-cluster';
import {EksNodesSpot} from './eks-nodes-spot'
import { networkInterfaces } from 'os';

export interface BastionProps {
    baseNetwork: BaseNetwrok;
    keyPairEC2: string;
    eksCluster: EksCluster;
    eksNodes: EksNodesSpot;
}

export class Bastion extends cdk.Construct {

    bastion: ec2.Instance;

    constructor(scope: cdk.Construct, id: string, props: BastionProps) {
        super(scope, id);

        this.bastion = new ec2.Instance(this, "Bastion", {
            keyName: props.keyPairEC2,
            vpc: props.baseNetwork.vpc,
            vpcSubnets: {subnetType: ec2.SubnetType.PUBLIC},
            instanceType: new ec2.InstanceType("t3.medium"),
            machineImage: new ec2.AmazonLinuxImage({generation:ec2.AmazonLinuxGeneration.AMAZON_LINUX_2}),
            role: props.eksNodes.nodesRole
            
        })
        this.bastion.connections.allowFromAnyIpv4(ec2.Port.tcp(22))
        this.bastion.addUserData(
            "set -e",
            "sudo yum update -y",
            "sudo yum install -y aws-cfn-bootstrap aws-cli jq wget",
            "curl -o kubectl https://amazon-eks.s3-us-west-2.amazonaws.com/1.14.6/2019-08-22/bin/linux/amd64/kubectl",
            "chmod +x ./kubectl",
            "curl -o aws-iam-authenticator https://amazon-eks.s3-us-west-2.amazonaws.com/1.14.6/2019-08-22/bin/linux/amd64/aws-iam-authenticator",
            "chmod +x ./aws-iam-authenticator",
            "export PATH=$HOME:$PATH",
            "aws eks --region "+cdk.Aws.REGION+" update-kubeconfig --name "+props.eksCluster.eksCluster.name,
            "curl -o aws-auth-cm.yaml https://amazon-eks.s3-us-west-2.amazonaws.com/cloudformation/2019-02-11/aws-auth-cm.yaml",
            "sed -i -e 's/<ARN of instance role (not instance profile)>/arn:aws:iam::"+cdk.Aws.ACCOUNT_ID+":role\/"+props.eksNodes.nodesRole.roleName+"/g' ./aws-auth-cm.yaml",
            "kubectl apply -f ./aws-auth-cm.yaml"
        )
        this.bastion
        
    }
}