import { Command, Flags } from '@oclif/core'

import { getBackend } from '../../backend/index.js';
import { destroyPackage, provisionPackage } from '../../infrastructure/index.js';
import { getConfigManager } from '../../lib/config/index.js';
import { getEnvManager } from '../../lib/env/index.js';
import { getParameterManager } from '../../lib/parameter/index.js';

export default class Up extends Command {

    static override description = 'Provision all packages in the project.'

    static override examples = [
        '<%= config.bin %> <%= command.id %>',
    ]

    static override flags = {
        chdir: Flags.string({
            description: 'directory to run command in',
            required: false,
        }),
        deploy: Flags.boolean({
            description: 'provision deployment companion packages',
            required: false,
        }),
        workspace: Flags.string({
            char: 'w',
            description: 'name of the workspace to install the packages for',
            required: false,
        }),
    }

    public async run(): Promise<void> {
        const { flags } = await this.parse(Up)

        const projectRootDir = flags.chdir || process.env.HEREYA_PROJECT_ROOT_DIR

        const configManager = getConfigManager()

        const loadConfigOutput = await configManager.loadConfig({ projectRootDir })
        if (!loadConfigOutput.found) {
            this.warn(`Project not initialized. Run 'hereya init' first.`)
            return
        }

        const { config } = loadConfigOutput
        const packages = Object.keys(config.packages ?? {})
        const backend = await getBackend()
        const savedStateOutput = await backend.getState({
            project: config.project,
        })
        let savedPackages: string[] = []
        if (savedStateOutput.found) {
            savedPackages = Object.keys(savedStateOutput.config.packages ?? {})
        }

        const removedPackages = savedPackages.filter((packageName) => !packages.includes(packageName))

        const workspace = flags.workspace || config.workspace
        const getWorkspaceEnvOutput = await backend.getWorkspaceEnv({
            project: config.project,
            workspace,
        })
        if (!getWorkspaceEnvOutput.success) {
            this.error(getWorkspaceEnvOutput.reason)
        }

        const { env: workspaceEnv } = getWorkspaceEnvOutput

        const parameterManager = getParameterManager()

        const removed = await Promise.all(removedPackages.map(async (packageName) => {
            const { parameters } = await parameterManager.getPackageParameters({
                package: packageName,
                projectRootDir,
                workspace,
            })
            const destroyOutput = await destroyPackage({
                env: workspaceEnv,
                isDeploying: flags.deploy,
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

        const added = await Promise.all(packages.map(async (packageName) => {
            const { parameters } = await parameterManager.getPackageParameters({
                package: packageName,
                projectRootDir,
                workspace,
            })
            const provisionOutput = await provisionPackage({
                env: workspaceEnv,
                isDeploying: flags.deploy,
                package: packageName,
                parameters,
                project: config.project,
                workspace,
            })
            if (!provisionOutput.success) {
                this.error(provisionOutput.reason)
            }

            const { env, metadata } = provisionOutput
            this.log(`Package ${packageName} provisioned successfully`)
            return { env, metadata, packageName }
        }))

        const envManager = getEnvManager()
        for (const { env, metadata } of removed) {
            // eslint-disable-next-line no-await-in-loop
            await Promise.all([
                envManager.removeProjectEnv({
                    env,
                    infra: metadata.originalInfra ?? metadata.infra,
                    projectRootDir,
                    workspace,
                }),
            ])
        }

        for (const { env, metadata } of added) {
            // eslint-disable-next-line no-await-in-loop
            await envManager.addProjectEnv({
                env,
                infra: metadata.originalInfra ?? metadata.infra,
                projectRootDir,
                workspace,
            })
        }

        const { config: newConfig } = await configManager.loadConfig({ projectRootDir })
        await backend.saveState(newConfig)
    }
}
