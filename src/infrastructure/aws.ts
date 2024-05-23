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
    async bootstrap(_: BootstrapInput): Promise<void> {

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

}
