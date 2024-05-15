export interface Backend {
    init(options: InitProjectInput): Promise<InitProjectOutput>;
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
        name: string;
    }
}
