import { Backend, InitProjectInput, InitProjectOutput } from './common.js';

export class LocalBackend implements Backend {
    async init(options: InitProjectInput): Promise<InitProjectOutput> {
        return {
            project: {
                id: options.project,
                name: options.project
            },
            workspace: {
                name: options.workspace
            }
        }
    }
}
