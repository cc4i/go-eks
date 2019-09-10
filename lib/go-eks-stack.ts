import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');

import { BaseNetwrok } from './base-network';
import { EksCluster } from './eks-cluster';
import { EksNodesSpot } from './eks-nodes-spot';
// import {EksWithSimple} from './eks-cluster-simple'
import { EcsBastion } from './ecs-bastion-server'
import { EksBastion } from './eks-bastion-server'
import { EcsWithSpot } from './ecs-cluster-spot';


export class GoEksStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    let is_ecs = process.env.IS_ECS;
    let ecs_cluster_name = process.env.ECS_CLUSTER_NAME;
    
    let eks_cluster_name = process.env.EKS_CLUSTER_NAME;
    let eks_stage_1 = process.env.EKS_STAGE_1;
    let eks_stage_2 = process.env.EKS_STAGE_2;

    if (is_ecs != undefined) {
        // VPC
        let baseNetwork = new BaseNetwrok(this, "BaseNetwork");

        const ecsBastion = new EcsBastion(this, 'Bastion', {
          baseNetwork: baseNetwork,
          keyPairEC2: "ore-keypair",
        });
        
        // ECS
        if (ecs_cluster_name == undefined) { ecs_cluster_name=id+"-ecs-cluster" }
        const ecsCluster = new EcsWithSpot(this, "EcsCluster", {
          baseNetwork: baseNetwork,
          clusterName: ecs_cluster_name,
          keyPairEC2: "ore-keypair",
          maxSizeASG: "10",
          minSizeASG: "4",
          desiredCapacityASG: "4",
          cooldownASG: "180",
          onDemandPercentage: 25
        });

    } else {
      if (eks_stage_1 != undefined) {

        // VPC
        let baseNetwork = new BaseNetwrok(this, "BaseNetwork");

        if (eks_cluster_name == undefined) { eks_cluster_name=id+"-eks-cluster" }
        const eksBastion = new EksBastion(this, 'Bastion', {
          baseNetwork: baseNetwork,
          keyPairEC2: "ore-keypair",
          clusterName: eks_cluster_name,
        });
      } else if (eks_stage_2 != undefined) {

        let baseVpcId = cdk.Fn.importValue("BaseVpcId")
        let publicSubne0tId = cdk.Fn.importValue("PublicSubne0tId")
        let publicSubnet1Id = cdk.Fn.importValue("PublicSubnet1Id")
        let privateSubne0tId = cdk.Fn.importValue("PrivateSubne0tId")
        let privateSubnet1Id = cdk.Fn.importValue("PrivateSubnet1Id")
        let controlPlaneSGId = cdk.Fn.importValue("ControlPlaneSGId")
        let nodesSGId = cdk.Fn.importValue("NodesSGId")
        let nodesSharedSGId = cdk.Fn.importValue("NodesSharedSGId")

        // EKS, all budiding are running on Bastion Server.
        if (eks_cluster_name == undefined) { eks_cluster_name=id+"-eks-cluster" }
        const eksCluster = new EksCluster(this, "EksCluster", {
          vpcId: baseVpcId,
          publicSubne0tId: publicSubne0tId,
          publicSubne1tId: publicSubnet1Id,
          privateSubne0tId: privateSubne0tId,
          privateSubne1tId: privateSubnet1Id,
          controlPlaneSGId: controlPlaneSGId,
          clusterName: eks_cluster_name
        });
    
        const eksNodes = new EksNodesSpot(this, "EksNodes", {
          eksCluster: eksCluster,
          nodesSGId: nodesSGId,
          nodesSharedSGId: nodesSharedSGId,
          publicSubne0tId: publicSubne0tId,
          publicSubne1tId: publicSubnet1Id,
          privateSubne0tId: privateSubne0tId,
          privateSubne1tId: privateSubnet1Id,
          keyPairEC2: "ore-keypair",
          maxSizeASG: "10",
          minSizeASG: "4",
          desiredCapacityASG: "4",
          cooldownASG: "180",
          onDemandPercentage: 25
        });

      }

    
    // Simple way to stand up EKS for fun.
      // const eksClusterSimple = new EksWithSimple(this, "EksClusterSimple", {
      //   baseNetwork: baseNetwork,
      //   keyPairEC2: "ore-keypair",
      //   maxSizeASG: "10",
      //   minSizeASG: "4",
      //   desiredCapacityASG: "4",
      //   cooldownASG: "180",
      //   onDemandPercentage: 25
      // });
    }
  }
  
}
