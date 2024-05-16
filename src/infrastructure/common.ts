import { z } from 'zod';
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
}

export const PackageMetadata = z.object({
    iac: z.nativeEnum(IacType),
    infra: z.nativeEnum(InfrastructureType),
});

export type ProvisionInput = {
    project: string;
    workspace: string;
    workspaceEnv: { [key: string]: string };
    pkgName: string;
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
