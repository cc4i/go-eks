import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');

import { BaseNetwrok } from './base-network';

export interface EksBastionProps {
    baseNetwork: BaseNetwrok;
    keyPairEC2: string;
    clusterName: string;
}

export class EksBastion extends cdk.Construct {

    bastion: ec2.Instance;
    bastionRole: iam.Role

    constructor(scope: cdk.Construct, id: string, props: EksBastionProps) {
        super(scope, id);

        this.bastionRole = new iam.Role(this, "BastionRole", {
            roleName: "bastion-role",
            assumedBy: new iam.ServicePrincipal('eks.amazonaws.com'),
            managedPolicies: [
                {managedPolicyArn: "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"},
                {managedPolicyArn: "arn:aws:iam::aws:policy/AmazonEKSServicePolicy"}
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
        this.bastion.instance.addOverride("Metadata", {"AWS::CloudFormation::Init":
            {
                "config": {
                    "files": {
                        "/root/first-run.sh": {
                            "content": [
                                "#!/bin/bash",
                                "set -xe",
                                "sleep 30",
                                "cd ~",
                                "export HOME=~",
                                "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash",
                                ". ~/.nvm/nvm.sh",
                                "nvm install node",
                                "npm i -g aws-cdk",
                                "mkdir ~/bin",
                                "curl -o ~/bin/kubectl https://amazon-eks.s3-us-west-2.amazonaws.com/1.14.6/2019-08-22/bin/linux/amd64/kubectl",
                                "chmod +x ~/bin/kubectl",
                                "curl -o ~/bin/aws-iam-authenticator https://amazon-eks.s3-us-west-2.amazonaws.com/1.14.6/2019-08-22/bin/linux/amd64/aws-iam-authenticator",
                                "chmod +x ~/bin/aws-iam-authenticator",
                                "export PATH=~/bin:$PATH",
                                "git clone https://github.com/cc4i/go-eks.git",
                                "cd go-eks",
                                
                                "export EKS_CLUSTER_NAME="+props.clusterName,
                                "export EKS_STAGE_2=yes",
                                "export AWS_DEFAULT_REGION="+cdk.Aws.REGION,
                                "export AWS_ACCESS_KEY_ID="+process.env.AWS_ACCESS_KEY_ID,
                                "export AWS_SECRET_ACCESS_KEY="+process.env.AWS_SECRET_ACCESS_KEY,
                                "npm install",
                                "npm run build",
                                "cdk deploy GoEksCluster --require-approval never",
                                "cd ~",
                                "aws eks --region "+cdk.Aws.REGION+" update-kubeconfig --name "+props.clusterName,
                                "curl -o ~/aws-auth-cm.yaml https://amazon-eks.s3-us-west-2.amazonaws.com/cloudformation/2019-02-11/aws-auth-cm.yaml",
                                "sed -i -e 's/<ARN of instance role (not instance profile)>/arn:aws:iam::"+cdk.Aws.ACCOUNT_ID+":role"+"\\"+"/nodes-for-eks-role/g' ~/aws-auth-cm.yaml",
                                "kubectl apply -f ~/aws-auth-cm.yaml",
                                "echo 'export AWS_DEFAULT_REGION="+cdk.Aws.REGION+"'>>~/.bash_profile",
                                "echo 'export AWS_ACCESS_KEY_ID="+process.env.AWS_ACCESS_KEY_ID+"'>>~/.bash_profile",
                                "echo 'export AWS_SECRET_ACCESS_KEY="+process.env.AWS_SECRET_ACCESS_KEY+"'>>~/.bash_profile",
                                "echo 'export PATH=~/bin:$PATH'>>~/.bash_profile",

                                                   
                            ].join('\n'),
                            "mode": "000755",
                            "owner": "root",
                            "group": "root"
                        }
                    },
                    // "commands": {
                    //     "agent1": {
                    //         "command":  "./first-run.sh >./run.log 2>./run.log",
                    //         "env": {
                    //             "STACK_NAME": `${cdk.Aws.STACK_NAME}`,
                    //             "AWS_DEFAULT_REGION": `${cdk.Aws.REGION}`,
                    //             "AWS_ACCESS_KEY_ID": process.env.AWS_ACCESS_KEY_ID,
                    //             "AWS_SECRET_ACCESS_KEY": process.env.AWS_SECRET_ACCESS_KEY
                    //         },
                    //         "cwd": "/root",
                    //         "ignoreErrors": false
                    //     }
                    // }
                }
            }}
        );
        
        this.bastion.addUserData(
            `set -xe`,
            `sudo yum update -y`,
            `sudo yum install -y aws-cfn-bootstrap aws-cli jq wget git`,
            `/opt/aws/bin/cfn-init -v --stack ${cdk.Aws.STACK_NAME} --resource ${this.bastion.instance.logicalId} --region ${cdk.Aws.REGION}`,
            `nohup /root/first-run.sh &`

        );
        
        
    }
}