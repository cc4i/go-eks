
# Launch EKS/ECS  by CDK

Automated launch EKS or ECS cluster, worker nodes with Auto Scaling Group are made up by On-Demand and Spot. 


## Prerequisite
awscli
cdk


## Configure environment

// Set fowllowing environemnt varibales for ECS
IS_ECS
ECS_CLUSTER_NAME

// Set fowllowing environemnt varibales for EKS
EKS_CLUSTER_NAME

## Provision

npm run build
cdk deploy


## Note

When you create an Amazon EKS cluster, the IAM entity user or role, such as a federated user that creates the cluster, is automatically granted system:masters permissions in the cluster's RBAC configuration. To grant additional AWS users or roles the ability to interact with your cluster, you must edit the aws-auth ConfigMap within Kubernetes.

https://docs.aws.amazon.com/eks/latest/userguide/add-user-role.html
https://stackoverflow.com/questions/50791303/kubectl-error-you-must-be-logged-in-to-the-server-unauthorized-when-accessing