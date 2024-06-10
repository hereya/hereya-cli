import { InfrastructureType } from '../infrastructure/common.js';
import { Config } from '../lib/config/common.js';

export interface Backend {
    addPackageToWorkspace(input: AddPackageToWorkspaceInput): Promise<AddPackageToWorkspaceOutput>;
    createWorkspace(input: CreateWorkspaceInput): Promise<CreateWorkspaceOutput>;
    deleteWorkspace(input: DeleteWorkspaceInput): Promise<DeleteWorkspaceOutput>;

    getProvisioningId(input: GetProvisioningIdInput): Promise<GetProvisioningIdOutput>;
    getState(input: GetStateInput): Promise<GetStateOutput>;
    getWorkspace(workspace: string): Promise<GetWorkspaceOutput>;
    getWorkspaceEnv(input: GetWorkspaceEnvInput): Promise<GetWorkspaceEnvOutput>;
    init(options: InitProjectInput): Promise<InitProjectOutput>;
    removePackageFromWorkspace(input: RemovePackageFromWorkspaceInput): Promise<RemovePackageFromWorkspaceOutput>;
    saveState(config: Omit<Config, 'workspace'>): Promise<void>;
}

export type AddPackageToWorkspaceInput = {
    env: { [key: string]: string };
    infra: InfrastructureType;
    package: string;
    parameters?: { [key: string]: string };
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

export type RemovePackageFromWorkspaceInput = AddPackageToWorkspaceInput;
export type RemovePackageFromWorkspaceOutput = AddPackageToWorkspaceOutput;

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
    project?: string;
    workspace: string;
}

export type GetWorkspaceEnvOutput = {
    env: { [key: string]: string }
    success: true;
} | {
    reason: string;
    success: false;
}

export type GetWorkspaceOutput = ({
    found: true,
    hasError: false
    workspace: {
        env?: { [key: string]: string };
        id: string;
        name: string;
        packages?: {
            [key: string]: {
                parameters?: { [key: string]: string };
                version: string;
            }
        };
    },
} | { error: string, found: true, hasError: true }) | { found: false }

export type GetStateInput = {
    project: string;
}

export type GetStateOutput = {
    config: Omit<Config, 'workspace'>;
    found: true
} | {
    found: false;
}

export type DeleteWorkspaceInput = {
    name: string;
}

export type DeleteWorkspaceOutput = {
    message?: string;
    success: true;
} | {
    reason: string;
    success: false;
}

export type GetProvisioningIdInput = {
    packageCanonicalName: string;
    project?: string;
    workspace?: string;
}

export type GetProvisioningIdOutput = {
    id: string;
    success: true;
} | {
    reason: string;
    success: false;
}
