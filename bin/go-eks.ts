#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { GoEksStack } from '../lib/go-eks-stack';
import os = require('os')
import { Tag } from '@aws-cdk/core';

const app = new cdk.App();
const stack = new GoEksStack(app, 'GoEksStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
    },
    stackName: process.env.STACK_NAME
});

//Tag envirionment & Owner
stack.node.applyAspect(new Tag("Env","Prod"))
stack.node.applyAspect(new Tag("Owner","CC"))
