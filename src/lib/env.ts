import { load, save } from './yaml-utils.js';
import * as path from 'node:path';
import { getAnyPath } from './filesystem.js';
import { InfrastructureType } from '../infrastructure/common.js';

export async function addEnv(input: AddEnvInput): Promise<void> {
    const envPath = await getEnvPath(input)
    const { data: existingEnv } = await load(envPath)
    const newEnv = Object.fromEntries(
        Object.entries(input.env)
        .map(([key, value]) => [key, `${input.infra}:${value}`])
    )
    const finalEnv = { ...existingEnv, ...newEnv }
    await save(finalEnv, envPath)
}

export async function removeEnv(input: RemoveEnvInput): Promise<void> {
    const envPath = await getEnvPath(input)
    const { data: existingEnv } = await load(envPath)
    const envKeysToRemove = Object.keys(input.env)

    const finalEnv = Object.fromEntries(
        Object
        .entries(input.env)
        .filter(([key]) => !envKeysToRemove.includes(key))
    )
    await save(finalEnv, envPath)
}

export type AddEnvInput = {
    env: { [key: string]: string };
    infra: InfrastructureType;
    workspace: string;
    projectRootDir?: string
}

export type RemoveEnvInput = AddEnvInput;

export function logEnv(env: { [key: string]: string }, logFn: (_: string) => void = console.log): void {
    for (const [key, value] of Object.entries(env)) {
        logFn(`${key}=${value}`)
    }
}

async function getEnvPath(input: AddEnvInput | RemoveEnvInput): Promise<string> {
    return await getAnyPath(
        path.join(input.projectRootDir ?? process.cwd(), '.hereya', `env.${input.workspace}.yaml`),
        path.join(input.projectRootDir ?? process.cwd(), '.hereya', `env.${input.workspace}.yml`),
    )
}
