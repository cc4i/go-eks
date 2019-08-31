#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { GoEksStack } from '../lib/go-eks-stack';

const app = new cdk.App();
new GoEksStack(app, 'GoEksStack');
