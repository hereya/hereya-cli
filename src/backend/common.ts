import { Config } from '../lib/config/common.js';

export interface Backend {
    createWorkspace(input: CreateWorkspaceInput): Promise<CreateWorkspaceOutput>;
    init(options: InitProjectInput): Promise<InitProjectOutput>;
    saveState(config: Omit<Config, 'workspace'>): Promise<void>;
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
