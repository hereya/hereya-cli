import { PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';

import { runShell } from '../lib/shell.js';
import {
    BootstrapInput,
    DestroyInput,
    DestroyOutput,
    Infrastructure,
    ProvisionInput,
    ProvisionOutput,
    ResolveEnvInput,
    ResolveEnvOutput,
    SaveEnvInput,
    SaveEnvOutput
} from './common.js';
import { provisionPackage } from './index.js';

export class AwsInfrastructure implements Infrastructure {
    async bootstrap(_: BootstrapInput): Promise<void> {
        const stsClient = new STSClient({});
        const { Account: accountId } = await stsClient.send(new GetCallerIdentityCommand({}));
        const region = process.env.AWS_REGION;

        runShell('npx', ['cdk', 'bootstrap', `aws://${accountId}/${region}`])

        const bootstrapPackage = 'hereya/bootstrap-aws-stack';

        const output = await provisionPackage({ package: bootstrapPackage });
        if (!output.success) {
            throw new Error(output.reason);
        }
    }

    async destroy(_: DestroyInput): Promise<DestroyOutput> {
        throw new Error('Method not implemented.');
    }

    async provision(_: ProvisionInput): Promise<ProvisionOutput> {
        throw new Error('Method not implemented.');
    }

    async resolveEnv(_: ResolveEnvInput): Promise<ResolveEnvOutput> {
        throw new Error('Method not implemented.');
    }

    async saveEnv(input: SaveEnvInput): Promise<SaveEnvOutput> {
        const key = `/hereya/${input.id}`;
        const ssmClient = new SSMClient({});
        const value = JSON.stringify(input.env);

        try {
            await ssmClient.send(new PutParameterCommand({
                Name: key,
                Overwrite: true,
                Type: 'String',
                Value: value
            }));
            return { success: true };
        } catch (error: any) {
            return { reason: error.message, success: false };
        }
    }

}
