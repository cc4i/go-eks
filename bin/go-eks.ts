#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { GoEksStack } from '../lib/go-eks-stack';
import os = require('os')
import { Tag } from '@aws-cdk/core';

const app = new cdk.App();
const stackBase = new GoEksStack(app, 'GoEksBase', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
    },
});

const stackCluster = new GoEksStack(app, 'GoEksCluster', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
    },
});

//Tag envirionment & Owner
stackBase.node.applyAspect(new Tag("Env","Prod"))
stackBase.node.applyAspect(new Tag("Owner","CC"))
