import path from 'node:path';

import { InfrastructureType } from '../../infrastructure/common.js';
import { resolveEnvValues } from '../env-utils.js';
import { getAnyPath } from '../filesystem.js';
import { load, save } from '../yaml-utils.js';


export class EnvManager {
    async addProjectEnv(input: AddEnvInput): Promise<void> {
        const envPath = await this.getEnvPath(input)
        const { data: existingEnv } = await load(envPath)
        const newEnv = Object.fromEntries(
            Object.entries(input.env)
            .map(([key, value]) => [key, `${input.infra}:${value}`])
        )
        const finalEnv = { ...existingEnv, ...newEnv }
        await save(finalEnv, envPath)
    }

    async getProjectEnv(input: GetProjectEnvInput): Promise<GetProjectEnvOutput> {
        const envPath = await this.getEnvPath(input)
        const { data: env } = await load<{ [k: string]: string }>(envPath)
        const resolvedEnv = await resolveEnvValues(env);
        return { env: resolvedEnv }
    }

    async removeProjectEnv(input: RemoveEnvInput): Promise<void> {
        const envPath = await this.getEnvPath(input)
        const { data: existingEnv } = await load(envPath)
        const envKeysToRemove = Object.keys(input.env)

        const finalEnv = Object.fromEntries(
            Object
            .entries(existingEnv)
            .filter(([key]) => !envKeysToRemove.includes(key))
        )
        await save(finalEnv, envPath)
    }


    private async getEnvPath(input: GetProjectEnvInput): Promise<string> {
        return getAnyPath(
            path.join(input.projectRootDir ?? process.cwd(), '.hereya', `env.${input.workspace}.yaml`),
            path.join(input.projectRootDir ?? process.cwd(), '.hereya', `env.${input.workspace}.yml`),
        )
    }
}

export const envManager = new EnvManager()

export function getEnvManager() {
    return envManager
}

export type AddEnvInput = {
    env: { [key: string]: string };
    infra: InfrastructureType;
    projectRootDir?: string
    workspace: string;
}

export type RemoveEnvInput = AddEnvInput;

export type GetProjectEnvInput = {
    projectRootDir?: string
    workspace: string;
}

export type GetProjectEnvOutput = {
    env: { [key: string]: string }
}
