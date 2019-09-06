import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import eks = require('@aws-cdk/aws-eks');
import autoscaling = require('@aws-cdk/aws-autoscaling');
//import cxapi = require("@aws-cdk/cx-api");
//import ssm = require('@aws-cdk/aws-ssm');
import iam = require('@aws-cdk/aws-iam');
// import ecsp = require('@aws-cdk/aws-ecs-patterns');

import { BaseNetwrok } from './base-network';
import { EksCluster } from './eks-cluster'


export interface EksNodesProps {
    eksCluster: EksCluster;
    baseNetwork: BaseNetwrok;
    keyPairEC2: string;
    maxSizeASG: string;
    minSizeASG: string;
    desiredCapacityASG: string;
    cooldownASG: string;
    onDemandPercentage: number;
}

export class EksNodesSpot extends cdk.Construct {

    nodesLaunchTemplate: ec2.CfnLaunchTemplate
    autoScalingGroup: autoscaling.CfnAutoScalingGroup
    nodesRole: iam.Role
    nodesSecurityGroup: ec2.SecurityGroup
    nodesSharedSecurityGroup: ec2.SecurityGroup

    constructor(scope: cdk.Construct, id: string, props: EksNodesProps) {
        super(scope, id)

        this.nodesRole = new iam.Role(this, "NodesRole", {
            roleName: "nodes-for-ecs-role",
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                {managedPolicyArn: "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"},
                {managedPolicyArn: "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"},
                {managedPolicyArn: "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"}
            ]
        });
        let ec2Profile = new iam.CfnInstanceProfile(this,"ec2Profile",{
            roles: [this.nodesRole.roleName]
        });

        this.nodesSecurityGroup = new ec2.SecurityGroup(this, "NodesSecurityGroup",{
            securityGroupName: "nodes-for-eks-sg",
            vpc: props.baseNetwork.vpc
        });
        //control panel access to nodes
        this.nodesSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22));
        this.nodesSecurityGroup.addIngressRule(props.eksCluster.controlPlaneSG, ec2.Port.tcpRange(1025,65535))
        this.nodesSecurityGroup.addIngressRule(props.eksCluster.controlPlaneSG, ec2.Port.tcp(443))
        

        //access to control panel
        props.eksCluster.controlPlaneSG.addIngressRule(this.nodesSecurityGroup, ec2.Port.tcp(443))

        this.nodesSharedSecurityGroup = new ec2.SecurityGroup(this, "NodesSharedSecurityGroup",{
            securityGroupName: "nodes-shared-for-eks-sg",
            vpc: props.baseNetwork.vpc
        });
        //node shared
        this.nodesSharedSecurityGroup.addIngressRule(this.nodesSharedSecurityGroup, ec2.Port.allTcp())
        
        this.nodesLaunchTemplate = new ec2.CfnLaunchTemplate(this, "NodesLaunchTemplate", {
            launchTemplateName: "NodesLaunchTemplate",
            launchTemplateData: {
                instanceType: "c5.large",
                imageId: new eks.EksOptimizedAmi().getImage(this).imageId,
                keyName: props.keyPairEC2,
                iamInstanceProfile: {arn: ec2Profile.attrArn},
                securityGroupIds: [this.nodesSecurityGroup.securityGroupId, this.nodesSharedSecurityGroup.securityGroupId],
                blockDeviceMappings: [{
                    deviceName: "/dev/xvda",
                    ebs: {
                        volumeSize: 40,
                        deleteOnTermination: true
                    }
                }]
                
            },
        });
        
        // this.nodesLaunchTemplate.addOverride("Metadata",{
        //     "AWS::CloudFormation::Init":{
        //         "config": {
        //             "files": {
        //                 "/etc/ecs/ecs.config": {
        //                     "content": ["ECS_CLUSTER="+this.cluster.clusterName].join('\n')
        //                 }
        //             }
        //         }
        //     }
        // });
           
        this.autoScalingGroup = new autoscaling.CfnAutoScalingGroup(this, "NodesAutoScalingGroup", {
            
            availabilityZones: [
                props.baseNetwork.vpc.publicSubnets[0].availabilityZone,
                props.baseNetwork.vpc.publicSubnets[1].availabilityZone
            ],
            vpcZoneIdentifier: [
                props.baseNetwork.vpc.publicSubnets[0].subnetId,
                props.baseNetwork.vpc.publicSubnets[1].subnetId,
                props.baseNetwork.vpc.privateSubnets[0].subnetId,
                props.baseNetwork.vpc.privateSubnets[1].subnetId
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
                value: "Member-of-NodesAutoScalingGroup",
                propagateAtLaunch: true
            }]
        });
        this.autoScalingGroup.node.addDependency(this.nodesLaunchTemplate);
        this.autoScalingGroup.addDependsOn(props.eksCluster.eksCluster);
        this.autoScalingGroup.addOverride("UpdatePolicy",{
            "AutoScalingScheduledAction": {
                "IgnoreUnmodifiedGroupSizeProperties": true
            },
            "AutoScalingRollingUpdate": {
                "MinInstancesInService": "1",
                "MaxBatchSize": "1",
                "WaitOnResourceSignals": true,
                "MinSuccessfulInstancesPercent": "100",
            }
        });
        this.autoScalingGroup.addOverride("CreationPolicy",{
            "ResourceSignal": {
                "Count": props.desiredCapacityASG,
                "Timeout": "PT15M"
            }
        });


        // moved here due to lookup 'logicalId'
        this.nodesLaunchTemplate.addPropertyOverride("LaunchTemplateData.UserData",cdk.Fn.base64([
            `#!/bin/bash`,
            `set -e`,
            `sudo yum update -y`,
            `sudo yum install -y aws-cfn-bootstrap aws-cli jq wget`,
            `/etc/eks/bootstrap.sh ${props.eksCluster.eksCluster.name}`,
            //`/opt/aws/bin/cfn-init -v --stack ${cdk.Aws.STACK_NAME} --resource ${this.nodesLaunchTemplate.logicalId} --region ${cdk.Aws.REGION}`,
            `/opt/aws/bin/cfn-signal -e $? --stack ${cdk.Aws.STACK_NAME} --resource ${this.autoScalingGroup.logicalId} --region ${cdk.Aws.REGION}`,
        ].join('\n')));

        
    }

}