import * as path from 'node:path';

import * as yaml from './yaml-utils.js';

export async function loadConfig(input: LoadConfigInput): Promise<LoadConfigOutput> {
    const configFilePath = getConfigPath(input.projectRootDir)
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
}

export async function saveConfig(input: SaveConfigInput): Promise<void> {
    const configFilePath = getConfigPath(input.projectRootDir)
    await yaml.save(input.config, configFilePath)
}

export interface SaveConfigInput {
    config: Config
    projectRootDir?: string
}


function getConfigPath(rootDir?: string): string {
    return path.join(rootDir ?? process.cwd(), 'hereya.yaml')
}

export interface Config {
    project: string
    workspace: string
}
