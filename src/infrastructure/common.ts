import { IacType } from '../iac/common.js';

export enum InfrastructureType {
    aws = 'aws',
    azure = 'azure',
    gcp = 'gcp',
    local = 'local'
}

export interface Infrastructure {
    bootstrap(input: BootstrapInput): Promise<void>;

    destroy(input: DestroyInput): Promise<DestroyOutput>;
    provision(input: ProvisionInput): Promise<ProvisionOutput>;

    resolveEnv(input: ResolveEnvInput): Promise<ResolveEnvOutput>;
}

export type BootstrapInput = {
    force?: boolean;
}

export type ProvisionInput = {
    canonicalName: string;
    iacType: IacType;
    pkgName: string;
    pkgUrl: string;
    project?: string;
    workspace: string;
    workspaceEnv?: { [key: string]: string };
}


export type ProvisionOutput = {
    env: { [key: string]: string };
    success: true;
} | {
    reason: string;
    success: false;
}

export type DestroyInput = ProvisionInput;

export type DestroyOutput = ProvisionOutput;

export type ResolveEnvInput = {
    value: string;
}

export type ResolveEnvOutput = {
    value: string;
}
