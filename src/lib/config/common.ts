export interface ConfigManager {
    loadConfig: (input: LoadConfigInput) => Promise<LoadConfigOutput>
    saveConfig: (input: SaveConfigInput) => Promise<void>
    addPackage: (input: AddPackageInput) => Promise<void>
    removePackage: (input: RemovePackageInput) => Promise<void>
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

export interface Config {
    project: string
    workspace: string
    packages?: {
        [key: string]: {
            version: string
        }
    }
}

export interface SaveConfigInput {
    config: Config
    projectRootDir?: string
}

export type AddPackageInput = {
    projectRootDir?: string
    package: string
}

export type RemovePackageInput = AddPackageInput
