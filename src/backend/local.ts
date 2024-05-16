import { Backend, InitProjectInput, InitProjectOutput } from './common.js';
import { Config } from '../lib/config.js';
import { getAnyPath } from '../lib/filesystem.js';
import * as path from 'node:path';
import * as os from 'node:os';
import { save } from '../lib/yaml-utils.js';

export class LocalBackend implements Backend {

    async init(options: InitProjectInput): Promise<InitProjectOutput> {
        return {
            project: {
                id: options.project,
                name: options.project,
            },
            workspace: {
                id: options.workspace,
                name: options.workspace,
            },
        }
    }

    async saveState(config: Omit<Config, 'workspace'>): Promise<void> {
        const projectStatePath = await getAnyPath(
            path.join(os.homedir(), '.hereya', 'state', 'projects', `${config.project}.yaml`),
            path.join(os.homedir(), '.hereya', 'state', 'projects', `${config.project}.yml`),
        )
        await save(config, projectStatePath)
    }
}
