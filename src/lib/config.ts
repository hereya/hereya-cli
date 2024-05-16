import * as path from 'node:path';

import * as yaml from './yaml-utils.js';
import { getAnyPath } from './filesystem.js';

export async function loadConfig(input: LoadConfigInput): Promise<LoadConfigOutput> {
    const configFilePath = await getConfigPath(input.projectRootDir)
    const { data: config, found } = await yaml.load<Config>(configFilePath)
    return {
        config,
        found,
    }
}

export interface LoadConfigInput {
    projectRootDir?: string
}


export type LoadConfigOutput = {
    config: Config
    found: true
} | {
    found: false
    config: Config
}

export async function saveConfig(input: SaveConfigInput): Promise<void> {
    const configFilePath = await getConfigPath(input.projectRootDir)
    await yaml.save(input.config, configFilePath)
}

export interface SaveConfigInput {
    config: Config
    projectRootDir?: string
}

export async function addPackage(input: AddPackageInput): Promise<void> {
    const { config } = await loadConfig({ projectRootDir: input.projectRootDir })
    await yaml.save({
        ...config,
        packages: {
            ...config.packages,
            [input.package]: {
                version: ''
            }
        },
    }, await getConfigPath(input.projectRootDir))

}

export type AddPackageInput = {
    projectRootDir?: string
    package: string
}

async function getConfigPath(rootDir?: string): Promise<string> {
    return await getAnyPath(
        path.join(rootDir ?? process.cwd(), 'hereya.yaml'),
        path.join(rootDir ?? process.cwd(), 'hereya.yml'),
    )
}

export interface Config {
    project: string
    workspace: string
    packages?: {
        [key: string]: {
            version: string
        }
    }
}
