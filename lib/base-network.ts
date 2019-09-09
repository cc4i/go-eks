import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import { CfnNatGateway } from '@aws-cdk/aws-ec2';
import { SSL_OP_ALL } from 'constants';



export class BaseNetwrok extends cdk.Construct {

    vpc: ec2.Vpc
    controlPlaneSG: ec2.SecurityGroup
    nodesSG: ec2.SecurityGroup
    nodesSharedSG: ec2.SecurityGroup

    constructor(scope: cdk.Construct, id: string) {
        super(scope, id);

        this.vpc = new ec2.Vpc(this, "BaseVpc", {
          cidr: "10.0.0.0/16",
        });

        const baseVpcId = new cdk.CfnOutput(this,"BaseVpcId", {
          exportName: "BaseVpcId",
          value: this.vpc.vpcId
        });
        const publicSubne0tId = new cdk.CfnOutput(this,"PublicSubne0tId", {
          exportName: "PublicSubne0tId",
          value: this.vpc.publicSubnets[0].subnetId
        });
        const publicSubnet1Id = new cdk.CfnOutput(this,"PublicSubnet1Id", {
          exportName: "PublicSubnet1Id",
          value: this.vpc.publicSubnets[1].subnetId
        });
        const privateSubne0tId = new cdk.CfnOutput(this,"PrivateSubne0tId", {
          exportName: "PrivateSubne0tId",
          value: this.vpc.privateSubnets[0].subnetId
        });
        const privateSubnet1Id = new cdk.CfnOutput(this,"PrivateSubnet1Id", {
          exportName: "PrivateSubnet1Id",
          value: this.vpc.privateSubnets[1].subnetId
        });

        // control panel security group 
        this.controlPlaneSG = new ec2.SecurityGroup(this, `EksControlPlaneSG`, {
          vpc: this.vpc
        });

        // work nodes security group
        this.nodesSG = new ec2.SecurityGroup(this, "NodesSecurityGroup",{
          securityGroupName: "nodes-for-eks-sg",
          vpc: this.vpc
        });
        //control panel access to nodes
        this.nodesSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22));
        this.nodesSG.addIngressRule(this.controlPlaneSG, ec2.Port.tcpRange(1025,65535))
        this.nodesSG.addIngressRule(this.controlPlaneSG, ec2.Port.tcp(443))
      

        //access to control panel
        this.controlPlaneSG.addIngressRule(this.nodesSG, ec2.Port.tcp(443))

        this.nodesSharedSG = new ec2.SecurityGroup(this, "NodesSharedSecurityGroup",{
            securityGroupName: "nodes-shared-for-eks-sg",
            vpc: this.vpc
        });
        //work nodes shared scurity group
        this.nodesSharedSG.addIngressRule(this.nodesSharedSG, ec2.Port.allTcp())

        const controlPlaneSGId = new cdk.CfnOutput(this,"ControlPlaneSGId", {
          exportName: "ControlPlaneSGId",
          value: this.controlPlaneSG.securityGroupId
        });
        const nodesSGId = new cdk.CfnOutput(this,"NodesSGId", {
          exportName: "NodesSGId",
          value: this.nodesSG.securityGroupId
        });
        const nodesSharedSGId = new cdk.CfnOutput(this,"NodesSharedSGId", {
          exportName: "NodesSharedSGId",
          value: this.nodesSharedSG.securityGroupId
        });


      }

}