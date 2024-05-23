import { Command, Flags } from '@oclif/core'

import { getBackend } from '../../backend/index.js';
import { destroyPackage } from '../../infrastructure/index.js';
import { getConfigManager } from '../../lib/config/index.js';
import { getEnvManager } from '../../lib/env/index.js';
import { getParameterManager } from '../../lib/parameter/index.js';

export default class Down extends Command {
    static override description = 'Destroy all packages in the project.'

    static override examples = [
        '<%= config.bin %> <%= command.id %>',
    ]

    static override flags = {
        chdir: Flags.string({
            description: 'directory to run command in',
            required: false,
        }),
        workspace: Flags.string({
            char: 'w',
            description: 'name of the workspace to install the packages for',
            required: false,
        }),
    }

    public async run(): Promise<void> {
        const { flags } = await this.parse(Down)

        const projectRootDir = flags.chdir || process.env.HEREYA_PROJECT_ROOT_DIR

        const configManager = getConfigManager()

        const loadConfigOutput = await configManager.loadConfig({ projectRootDir })
        if (!loadConfigOutput.found) {
            this.warn(`Project not initialized. Run 'hereya init' first.`)
            return
        }

        const { config } = loadConfigOutput
        const packages = Object.keys(config.packages ?? {})
        const workspace = flags.workspace || config.workspace
        const backend = await getBackend()
        const getWorkspaceEnvOutput = await backend.getWorkspaceEnv({
            project: config.project,
            workspace,
        })
        if (!getWorkspaceEnvOutput.success) {
            this.error(getWorkspaceEnvOutput.reason)
        }

        const { env: workspaceEnv } = getWorkspaceEnvOutput

        const parameterManager = getParameterManager()

        const result = await Promise.all(packages.map(async (packageName) => {
            const { parameters } = await parameterManager.getPackageParameters({
                package: packageName,
                projectRootDir,
                workspace,
            })
            const destroyOutput = await destroyPackage({
                env: workspaceEnv,
                package: packageName,
                parameters,
                project: config.project,
                workspace,
            })
            if (!destroyOutput.success) {
                this.error(destroyOutput.reason)
            }

            this.log(`Package ${packageName} destroyed successfully`)
            const { env, metadata } = destroyOutput
            return { env, metadata, packageName }
        }))

        const envManager = getEnvManager()
        for (const { env, metadata } of result) {
            // eslint-disable-next-line no-await-in-loop
            await envManager.removeProjectEnv({
                env,
                infra: metadata.infra,
                projectRootDir,
                workspace,
            })
        }

        const { config: newConfig } = await configManager.loadConfig({ projectRootDir })
        await backend.saveState(newConfig)
    }
}
