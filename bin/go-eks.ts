#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { GoEksStack } from '../lib/go-eks-stack';
import os = require('os')
import { Tag } from '@aws-cdk/core';

const app = new cdk.App();

const stackEcsCluster = new GoEksStack(app, 'GoEcs', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
    },
});

const stackEksBase = new GoEksStack(app, 'GoEks', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
    },
});

const stackEksCluster = new GoEksStack(app, 'GoEksCluster', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
    },
});

//Tag envirionment & Owner
stackEcsCluster.node.applyAspect(new Tag("Owner","CC"))
stackEksBase.node.applyAspect(new Tag("Owner","CC"))
stackEksCluster.node.applyAspect(new Tag("Owner","CC"))
