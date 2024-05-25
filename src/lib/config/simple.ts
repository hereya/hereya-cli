import path from 'node:path';

import { getAnyPath } from '../filesystem.js';
import * as yaml from '../yaml-utils.js';
import {
    AddPackageInput,
    Config,
    ConfigManager,
    LoadConfigInput,
    LoadConfigOutput,
    RemovePackageInput,
    SaveConfigInput
} from './common.js';

export class SimpleConfigManager implements ConfigManager {
    async addPackage(input: AddPackageInput): Promise<void> {
        const { config } = await this.loadConfig({ projectRootDir: input.projectRootDir })
        await yaml.save({
            ...config,
            ...(input.deploy ? {
                deploy: {
                    ...config.deploy,
                    [input.package]: {
                        version: '',
                    }
                }
            } : {
                packages: {
                    ...config.packages,
                    [input.package]: {
                        version: '',
                    }
                }
            }),
        }, await this.getConfigPath(input.projectRootDir))

    }

    async loadConfig(input: LoadConfigInput): Promise<LoadConfigOutput> {
        const configFilePath = await this.getConfigPath(input.projectRootDir)
        const { data: config, found } = await yaml.load<Config>(configFilePath)
        return {
            config,
            found,
        }
    }

    async removePackage(input: RemovePackageInput): Promise<void> {
        const { config } = await this.loadConfig({ projectRootDir: input.projectRootDir })
        const newPackages = { ...config.packages }
        const newDeploy = { ...config.deploy }
        if (input.deploy) {
            delete newDeploy[input.package]
        } else {
            delete newPackages[input.package]
        }

        await yaml.save({
            ...config,
            deploy: newDeploy,
            packages: newPackages,
        }, await this.getConfigPath(input.projectRootDir))
    }

    async saveConfig(input: SaveConfigInput): Promise<void> {
        const configFilePath = await this.getConfigPath(input.projectRootDir)
        await yaml.save(input.config, configFilePath)
    }

    private async getConfigPath(rootDir?: string): Promise<string> {
        return getAnyPath(
            path.join(rootDir ?? process.cwd(), 'hereya.yaml'),
            path.join(rootDir ?? process.cwd(), 'hereya.yml'),
        )
    }

}
