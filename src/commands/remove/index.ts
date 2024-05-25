import { Args, Command, Flags } from '@oclif/core'

import { getBackend } from '../../backend/index.js';
import { destroyPackage } from '../../infrastructure/index.js';
import { getConfigManager } from '../../lib/config/index.js';
import { getEnvManager } from '../../lib/env/index.js';
import { getParameterManager } from '../../lib/parameter/index.js';

export default class Remove extends Command {
    static override args = {
        package: Args.string({
            description: 'The package to remove. Packages are gitHub repositories. Use the format owner/repository',
            required: true
        }),
    }

    static override description = 'Remove a package from the project.'

    static override examples = [
        '<%= config.bin %> <%= command.id %> cloudy/docker_postgres',
    ]

    static override flags = {
        chdir: Flags.string({
            description: 'directory to run command in',
            required: false,
        }),
    }

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(Remove)

        const projectRootDir = flags.chdir || process.env.HEREYA_PROJECT_ROOT_DIR

        const configManager = getConfigManager()
        const loadConfigOutput = await configManager.loadConfig({ projectRootDir })
        if (!loadConfigOutput.found) {
            this.warn(`Project not initialized. Run 'hereya init' first.`)
            return
        }

        const { config } = loadConfigOutput
        if (!(args.package in (config.packages ?? {})) && !(args.package in (config.deploy ?? {}))) {
            this.warn(`Package ${args.package} not found in project.`)
            return
        }

        const backend = await getBackend()
        const getWorkspaceEnvOutput = await backend.getWorkspaceEnv({
            project: config.project,
            workspace: config.workspace,
        })
        if (!getWorkspaceEnvOutput.success) {
            this.error(getWorkspaceEnvOutput.reason)
        }

        const { env: workspaceEnv } = getWorkspaceEnvOutput
        const parameterManager = getParameterManager()
        const { parameters } = await parameterManager.getPackageParameters({
            package: args.package,
            projectRootDir,
            workspace: config.workspace,
        })
        const destroyOutput = await destroyPackage({
            env: workspaceEnv,
            package: args.package,
            parameters,
            project: config.project,
            skipDeploy: true,
            workspace: config.workspace,
        })

        if (!destroyOutput.success) {
            this.error(destroyOutput.reason)
        }

        const { env, metadata } = destroyOutput

        if (!metadata.deploy) {
            this.log(`Infrastructure resources for ${args.package} have been destroyed`)
        }

        this.log('removing package env vars from project')

        const envManager = getEnvManager()
        await envManager.removeProjectEnv({
            env,
            infra: metadata.infra,
            projectRootDir,
            workspace: config.workspace
        })
        await configManager.removePackage({
            deploy: metadata.deploy,
            package: args.package,
            projectRootDir,
        })

        const { config: newConfig } = await configManager.loadConfig({ projectRootDir })
        await backend.saveState(newConfig)
    }
}
