import { IacType } from '../iac/common.js';

export enum InfrastructureType {
    local = 'local',
    aws = 'aws',
    azure = 'azure',
    gcp = 'gcp'
}

export interface Infrastructure {
    bootstrap(): Promise<void>;
    provision(input: ProvisionInput): Promise<ProvisionOutput>;

    destroy(input: DestroyInput): Promise<DestroyOutput>;
}

export type ProvisionInput = {
    project: string;
    workspace: string;
    workspaceEnv: { [key: string]: string };
    pkgName: string;
    canonicalName: string;
    pkgUrl: string;
    iacType: IacType;
}


export type ProvisionOutput = {
    success: true;
    env: { [key: string]: string };
} | {
    success: false;
    reason: string;
}

export type DestroyInput = ProvisionInput;

export type DestroyOutput = ProvisionOutput;
