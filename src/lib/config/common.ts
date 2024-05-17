export interface ConfigManager {
    addPackage: (input: AddPackageInput) => Promise<void>
    loadConfig: (input: LoadConfigInput) => Promise<LoadConfigOutput>
    removePackage: (input: RemovePackageInput) => Promise<void>
    saveConfig: (input: SaveConfigInput) => Promise<void>
}

export interface LoadConfigInput {
    projectRootDir?: string
}


export type LoadConfigOutput = {
    config: Config
    found: false
} | {
    config: Config
    found: true
}

export interface Config {
    packages?: {
        [key: string]: {
            version: string
        }
    }
    project: string
    workspace: string
}

export interface SaveConfigInput {
    config: Config
    projectRootDir?: string
}

export type AddPackageInput = {
    package: string
    projectRootDir?: string
}

export type RemovePackageInput = AddPackageInput
