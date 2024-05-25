import { IacType } from '../iac/common.js';

export enum InfrastructureType {
    aws = 'aws',
    azure = 'azure',
    gcp = 'gcp',
    local = 'local'
}

export interface Infrastructure {
    bootstrap(input: BootstrapInput): Promise<void>;

    deploy(input: DeployInput): Promise<DeployOutput>;
    destroy(input: DestroyInput): Promise<DestroyOutput>;
    provision(input: ProvisionInput): Promise<ProvisionOutput>;
    resolveEnv(input: ResolveEnvInput): Promise<ResolveEnvOutput>;
    saveEnv(input: SaveEnvInput): Promise<SaveEnvOutput>;

    undeploy(input: UndeployInput): Promise<UndeployOutput>;
}

export type BootstrapInput = {
    force?: boolean;
}

export type ProvisionInput = {
    canonicalName: string;
    env?: { [key: string]: string };
    iacType: IacType;
    id: string;
    parameters?: { [key: string]: string };
    pkgName: string;
    pkgUrl: string;
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

export type DeployInput = {
    projectEnv: { [key: string]: string };
    projectRootDir: string;
} & ProvisionInput

export type DeployOutput = ProvisionOutput;

export type UndeployInput = DeployInput;
export type UndeployOutput = DeployOutput;

export type ResolveEnvInput = {
    value: string;
}

export type ResolveEnvOutput = {
    isSecret?: boolean;
    value: string;
}

export type SaveEnvInput = {
    env: { [key: string]: string };
    id: string;
}

export type SaveEnvOutput = {
    reason: string;
    success: false;
} | {
    success: true;
}
