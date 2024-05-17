import { InfrastructureType } from '../infrastructure/common.js';
import { Config } from '../lib/config/common.js';

export interface Backend {
    addPackageToWorkspace(input: AddPackageToWorkspaceInput): Promise<AddPackageToWorkspaceOutput>;
    createWorkspace(input: CreateWorkspaceInput): Promise<CreateWorkspaceOutput>;

    getWorkspaceEnv(input: GetWorkspaceEnvInput): Promise<GetWorkspaceEnvOutput>;
    init(options: InitProjectInput): Promise<InitProjectOutput>;
    saveState(config: Omit<Config, 'workspace'>): Promise<void>;
}

export type AddPackageToWorkspaceInput = {
    env: { [key: string]: string };
    infra: InfrastructureType;
    package: string;
    workspace: string;
}

export type AddPackageToWorkspaceOutput = {
    reason: string;
    success: false;
} | {
    success: true;
    workspace: {
        id: string;
        name: string;
        packages?: {
            [key: string]: {
                version: string;
            }
        };
    }
}

export interface InitProjectInput {
    project: string;
    workspace: string;
}

export interface InitProjectOutput {
    project: {
        id: string;
        name: string
    }
    workspace: {
        id: string;
        name: string;
    }
}

export interface CreateWorkspaceInput {
    name: string;
}


export type CreateWorkspaceOutput = {
    isNew: boolean;
    success: true;
    workspace: {
        id: string;
        name: string;
    }
} | {
    reason: string;
    success: false;
}

export type GetWorkspaceEnvInput = {
    project: string;
    workspace: string;
}

export type GetWorkspaceEnvOutput = {
    env: { [key: string]: string }
    success: true;
} | {
    reason: string;
    success: false;
}
