import {
    BootstrapInput,
    DestroyInput,
    DestroyOutput,
    Infrastructure,
    ProvisionInput,
    ProvisionOutput,
    ResolveEnvInput,
    ResolveEnvOutput
} from './common.js';

export class AwsInfrastructure implements Infrastructure {
    async bootstrap(input: BootstrapInput): Promise<void> {

    }

    async destroy(input: DestroyInput): Promise<DestroyOutput> {
        throw new Error('Method not implemented.');
    }

    async provision(input: ProvisionInput): Promise<ProvisionOutput> {
        throw new Error('Method not implemented.');
    }

    async resolveEnv(input: ResolveEnvInput): Promise<ResolveEnvOutput> {
        throw new Error('Method not implemented.');
    }

}
