import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');

import { BaseNetwrok } from './base-network';

export interface EcsBastionProps {
    baseNetwork: BaseNetwrok;
    keyPairEC2: string;
}

export class EcsBastion extends cdk.Construct {

    bastion: ec2.Instance;
    bastionRole: iam.Role

    constructor(scope: cdk.Construct, id: string, props: EcsBastionProps) {
        super(scope, id);

        this.bastionRole = new iam.Role(this, "BastionRole", {
            roleName: "bastion-role",
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                {managedPolicyArn: "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"},
                {managedPolicyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"}
            ]
        });

        this.bastion = new ec2.Instance(this, "Bastion", {
            keyName: props.keyPairEC2,
            vpc: props.baseNetwork.vpc,
            vpcSubnets: {subnetType: ec2.SubnetType.PUBLIC},
            instanceType: new ec2.InstanceType("t3.medium"),
            machineImage: new ec2.AmazonLinuxImage({generation:ec2.AmazonLinuxGeneration.AMAZON_LINUX_2}),
            role: this.bastionRole
            
        });
        this.bastion.connections.allowFromAnyIpv4(ec2.Port.tcp(22))
        
        this.bastion.addUserData(
            `set -xe`,
            `sudo yum update -y`,
            `sudo yum install -y aws-cfn-bootstrap aws-cli jq wget git`,
            `/opt/aws/bin/cfn-init -v --stack ${cdk.Aws.STACK_NAME} --resource ${this.bastion.instance.logicalId} --region ${cdk.Aws.REGION}`,
            `echo 'export AWS_DEFAULT_REGION="+${cdk.Aws.REGION}+"'>>/home/ec2-user/.bash_profile`,
            `echo 'export AWS_ACCESS_KEY_ID="+${process.env.AWS_ACCESS_KEY_ID}+"'>>/home/ec2-user/.bash_profile`,
            `echo 'export AWS_SECRET_ACCESS_KEY="+${process.env.AWS_SECRET_ACCESS_KEY}+"'>>/home/ec2-user/.bash_profile`

        );
        
        
    }
}