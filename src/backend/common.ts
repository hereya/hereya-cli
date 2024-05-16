import { Config } from '../lib/config.js';

export interface Backend {
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
