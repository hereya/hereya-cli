import { load, save } from './yaml-utils.js';
import * as path from 'node:path';
import { getAnyPath } from './filesystem.js';
import { InfrastructureType } from '../infrastructure/common.js';
import { getInfrastructure } from '../infrastructure/index.js';

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

export type AddEnvInput = {
    env: { [key: string]: string };
    infra: InfrastructureType;
    workspace: string;
    projectRootDir?: string
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


export type RemoveEnvInput = AddEnvInput;

export async function getProjectEnv(input: GetProjectEnvInput): Promise<GetProjectEnvOutput> {
    const envPath = await getEnvPath(input)
    const { data: env } = await load(envPath)
    const resolvedEnv = Object.fromEntries(
        await Promise.all(
            Object.entries(env)
            .map(async ([key, value]) => {
                const infraType = value.split(':')[0] as InfrastructureType
                const infra$ = await getInfrastructure({ type: infraType })
                if (!infra$.supported) {
                    throw new Error(infra$.reason)
                }
                const { infrastructure } = infra$
                const valueWithoutInfra = value.split(':').slice(1).join(':')
                const { value: resolvedValue } = await infrastructure.resolveEnv({ value: valueWithoutInfra })
                return [key, resolvedValue]
            })
        )
    )
    return { env: resolvedEnv }
}

export type GetProjectEnvInput = {
    workspace: string;
    projectRootDir?: string
}

export type GetProjectEnvOutput = {
    env: { [key: string]: string }
}

export function logEnv(env: { [key: string]: string }, logFn: (_: string) => void = console.log): void {
    for (const [key, value] of Object.entries(env)) {
        logFn(`${key}=${value}`)
    }
}

async function getEnvPath(input: GetProjectEnvInput): Promise<string> {
    return await getAnyPath(
        path.join(input.projectRootDir ?? process.cwd(), '.hereya', `env.${input.workspace}.yaml`),
        path.join(input.projectRootDir ?? process.cwd(), '.hereya', `env.${input.workspace}.yml`),
    )
}
