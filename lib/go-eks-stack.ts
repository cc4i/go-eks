import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');

import { BaseNetwrok } from './base-network';
import { EksCluster } from './eks-cluster';
import { EksNodesSpot } from './eks-nodes-spot';
import {EksWithSimple} from './eks-cluster-simple'
import { Ec2Service } from '@aws-cdk/aws-ecs';
import { Bastion } from './bastion-server'
import { EcsWithSpot } from './ecs-cluster-spot';


let is_ecs = process.env.IS_ECS;
let eks_cluster_name = process.env.EKS_CLUSTER_NAME;
let ecs_cluster_name = process.env.ECS_CLUSTER_NAME;

export class GoEksStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC
    const baseNetwork = new BaseNetwrok(this, "BaseNetwork");

    if (is_ecs != undefined) {
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
      // EKS
      if (eks_cluster_name == undefined) { eks_cluster_name=id+"-eks-cluster" }
      const eksCluster = new EksCluster(this, "EksCluster", {
        baseNetwork: baseNetwork,
        clusterName: eks_cluster_name
      });
  
      const eksNodes = new EksNodesSpot(this, "EksNodes", {
        eksCluster: eksCluster,
        baseNetwork: baseNetwork,
        keyPairEC2: "ore-keypair",
        maxSizeASG: "10",
        minSizeASG: "4",
        desiredCapacityASG: "4",
        cooldownASG: "180",
        onDemandPercentage: 25
      });
  
      const bastion = new Bastion(this, 'Bastion', {
        baseNetwork: baseNetwork,
        keyPairEC2: "ore-keypair",
        eksCluster: eksCluster,
        eksNodes: eksNodes
      });
      bastion.node.addDependency(eksCluster, eksNodes);
  
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
