import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import autoscaling = require('@aws-cdk/aws-autoscaling');
//import cxapi = require("@aws-cdk/cx-api");
//import ssm = require('@aws-cdk/aws-ssm');
import iam = require('@aws-cdk/aws-iam');
// import ecsp = require('@aws-cdk/aws-ecs-patterns');

import { BaseNetwrok } from './base-network';


export interface EcsWithSpotProps {
    baseNetwork: BaseNetwrok;
    clusterName: string;
    keyPairEC2: string;
    maxSizeASG: string;
    minSizeASG: string;
    desiredCapacityASG: string;
    cooldownASG: string;
    onDemandPercentage: number;
}

const nodesPolicy: string[] = [
    "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role",
    "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
]

export class EcsWithSpot extends cdk.Construct {

    cluster: ecs.Cluster
    nodesLaunchTemplate: ec2.CfnLaunchTemplate
    autoScalingGroup: autoscaling.CfnAutoScalingGroup
    nodesRole: iam.Role
    nodesSecurityGroup: ec2.SecurityGroup

    
    constructor(scope: cdk.Construct, id: string, props: EcsWithSpotProps) {
        super(scope, id);
        
        // const nodeAMI = ssm.StringParameter.fromStringParameterAttributes(this,"ami",{
        //     parameterName: "/aws/service/ecs/optimized-ami/amazon-linux-2/recommended/image_id"
        // });


        this.nodesRole = new iam.Role(this, "NodesRole", {
            roleName: "nodes-for-ecs-role",
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                {managedPolicyArn: "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"},
                {managedPolicyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"}
            ]
        });
        let ec2Profile = new iam.CfnInstanceProfile(this,"ec2Profile",{
            roles: [this.nodesRole.roleName]
        });

        this.nodesSecurityGroup = new ec2.SecurityGroup(this, "NodesSecurityGroup",{
            securityGroupName: "nodes-for-ecs-sg",
            vpc: props.baseNetwork.vpc
        });
        this.nodesSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22));

        this.cluster = new ecs.Cluster(this, "EcsClusterWithSpot", {
            vpc: props.baseNetwork.vpc,
            clusterName: props.clusterName
        });
        
        this.nodesLaunchTemplate = new ec2.CfnLaunchTemplate(this, "NodesLaunchTemplate", {
            launchTemplateName: "NodesLaunchTemplate",
            launchTemplateData: {
                instanceType: "c5.large",
                imageId: new ecs.EcsOptimizedAmi().getImage(this).imageId,
                keyName: props.keyPairEC2,
                iamInstanceProfile: {arn: ec2Profile.attrArn},
                securityGroupIds: [this.nodesSecurityGroup.securityGroupId],
                blockDeviceMappings: [{
                    deviceName: "/dev/xvda",
                    ebs: {
                        volumeSize: 40,
                        deleteOnTermination: true
                    }
                }]
                
            },
        });
        
        this.nodesLaunchTemplate.addOverride("Metadata",{
            "AWS::CloudFormation::Init":{
                "config": {
                    "files": {
                        "/etc/ecs/ecs.config": {
                            "content": ["ECS_CLUSTER="+this.cluster.clusterName].join('\n')
                        }
                    }
                }
            }
        });
           
        this.autoScalingGroup = new autoscaling.CfnAutoScalingGroup(this, "NodesAutoScalingGroup", {
            availabilityZones: props.baseNetwork.vpc.availabilityZones,
            vpcZoneIdentifier: [
                props.baseNetwork.vpc.publicSubnets[0].subnetId,
                props.baseNetwork.vpc.publicSubnets[1].subnetId
            ],
            desiredCapacity: props.desiredCapacityASG,
            cooldown: props.cooldownASG,
            healthCheckType: "EC2",
            maxSize: props.maxSizeASG,
            minSize: props.minSizeASG,
            mixedInstancesPolicy: {
                instancesDistribution: {
                    onDemandBaseCapacity: 0,
                    onDemandPercentageAboveBaseCapacity: props.onDemandPercentage,
                    spotAllocationStrategy: "lowest-price",
                    // spotInstancePools: "4"
                },
                launchTemplate: {
                    launchTemplateSpecification: {
                        launchTemplateName: this.nodesLaunchTemplate.launchTemplateName,
                        version: this.nodesLaunchTemplate.attrLatestVersionNumber
                    },
                    overrides: [
                        {instanceType: "c5.large"},{instanceType: "r5.large"},{instanceType: "m5.large"},
                    ]
                }
            },
            tags: [{
                key: "Name",
                value: "nodes-asg-"+this.cluster.clusterName,
                propagateAtLaunch: true
            }]
        });
        this.autoScalingGroup.node.addDependency(this.nodesLaunchTemplate);
        // moved here due to lookup 'logicalId'
        this.nodesLaunchTemplate.addPropertyOverride("LaunchTemplateData.UserData",cdk.Fn.base64([
            `#!/bin/bash`,
            `set -e`,
            `sudo yum update -y`,
            `sudo yum install -y aws-cfn-bootstrap aws-cli jq wget`,
            `/opt/aws/bin/cfn-init -v --stack ${cdk.Aws.STACK_NAME} --resource ${this.nodesLaunchTemplate.logicalId} --region ${cdk.Aws.REGION}`,
            `/opt/aws/bin/cfn-signal -e $? --stack ${cdk.Aws.STACK_NAME} --resource ${this.autoScalingGroup.logicalId} --region ${cdk.Aws.REGION}`,
        ].join('\n')));

    }


}