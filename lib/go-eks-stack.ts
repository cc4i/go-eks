import cdk = require('@aws-cdk/core');
import { BaseNetwrok } from './base-network';
//import { EcsWithSpot } from './ecs-cluster-by-spot';
import { EksCluster } from './eks-cluster';
import { EksNodesSpot } from './eks-nodes-spot';
import {EksWithSimple} from './eks-cluster-simple'

export class GoEksStack extends cdk.Stack {
  
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const baseNetwork = new BaseNetwrok(this, "BaseNetwork");
    
    // const ecsCluster = new EcsWithSpot(this, "EcsCluster", {
    //   baseNetwork: baseNetwork,
    //   keyPairEC2: "ore-keypair",
    //   maxSizeASG: "10",
    //   minSizeASG: "4",
    //   desiredCapacityASG: "4",
    //   cooldownASG: "180",
    //   onDemandPercentage: 25
    // });

    const eksCluster = new EksCluster(this, "EksCluster", {
      baseNetwork: baseNetwork,
      keyPairEC2: "ore-keypair",
      maxSizeASG: "10",
      minSizeASG: "4",
      desiredCapacityASG: "4",
      cooldownASG: "180",
      onDemandPercentage: 25
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
