import { Command, Flags } from '@oclif/core';
import path from 'node:path';

import { getBackend } from '../../backend/index.js';
import { destroyPackage, provisionPackage } from '../../infrastructure/index.js';
import { getConfigManager } from '../../lib/config/index.js';
import { getEnvManager } from '../../lib/env/index.js';
import { logEnv } from '../../lib/env-utils.js';
import { getLogger } from '../../lib/log.js';
import { getParameterManager } from '../../lib/parameter/index.js';
import { setDebug } from '../../lib/shell.js';
import Up from '../up/index.js';

export default class Deploy extends Command {
    static override description = 'Deploy a hereya project using the project deployment package'

    static override examples = [
        '<%= config.bin %> <%= command.id %>',
    ]

    static override flags = {
        chdir: Flags.string({
            description: 'directory to run command in',
            required: false,
        }),
        debug: Flags.boolean({
            default: false,
            description: 'enable debug mode',
        }),
        workspace: Flags.string({
            char: 'w',
            description: 'name of the workspace to deploy the packages for',
            required: true,
        }),
    }

    public async run(): Promise<void> {
        const { flags } = await this.parse(Deploy)
        
        setDebug(flags.debug)

        const logger = getLogger()

        const projectRootDir = path.resolve(flags.chdir || process.env.HEREYA_PROJECT_ROOT_DIR || process.cwd())
        const configManager = getConfigManager()
        const loadConfigOutput = await configManager.loadConfig({ projectRootDir })
        if (!loadConfigOutput.found) {
            this.warn(`Project not initialized. Run 'hereya init' first.`)
            return
        }

        const { config } = loadConfigOutput
        const deployPackages = Object.keys(config.deploy ?? {})
        const backend = await getBackend()
        const savedStateOutput = await backend.getState({
            project: config.project,
        })
        let savedPackages: string[] = []
        if (savedStateOutput.found) {
            savedPackages = Object.keys(savedStateOutput.config.deploy ?? {})
        }

        const removedPackages = savedPackages.filter((packageName) => !deployPackages.includes(packageName))
        const { workspace } = flags
        const getWorkspaceEnvOutput = await backend.getWorkspaceEnv({
            project: config.project,
            workspace,
        })
        if (!getWorkspaceEnvOutput.success) {
            this.error(getWorkspaceEnvOutput.reason)
        }

        const { env: workspaceEnv } = getWorkspaceEnvOutput
        const parameterManager = getParameterManager()
        const envManager = getEnvManager()
        const { env: projectEnv } = await envManager.getProjectEnv({
            markSecret: true,
            projectRootDir,
            workspace,
        })

        if (removedPackages.length > 0) {
            logger.log(`Destroying ${removedPackages.length} removed packages`)
        }

        await Promise.all(removedPackages.map(async (packageName) => {
            const { parameters } = await parameterManager.getPackageParameters({
                package: packageName,
                projectRootDir,
                workspace,
            })
            const destroyOutput = await destroyPackage({
                env: workspaceEnv,
                isDeploying: true,
                package: packageName,
                parameters,
                project: config.project,
                projectEnv,
                projectRootDir,
                workspace,
            })
            if (!destroyOutput.success) {
                this.error(destroyOutput.reason)
            }

        }))

        if (removedPackages.length > 0) {
            logger.done(`Destroyed ${removedPackages.length} removed packages`)
        }

        await Up.run(['--chdir', projectRootDir, '--workspace', workspace, '--deploy'])


        logger.log(`Provisioning ${deployPackages.length} deployment packages`)
        const { env: newProjectEnv } = await envManager.getProjectEnv({
            markSecret: true,
            projectRootDir,
            workspace,
        })

        await Promise.all(deployPackages.map(async (packageName) => {
            const { parameters } = await parameterManager.getPackageParameters({
                package: packageName,
                projectRootDir,
                workspace,
            })
            const provisionOutput = await provisionPackage({
                env: workspaceEnv,
                isDeploying: true,
                package: packageName,
                parameters,
                project: config.project,
                projectEnv: newProjectEnv,
                projectRootDir,
                workspace,
            })
            if (!provisionOutput.success) {
                this.error(provisionOutput.reason)
            }

            this.log(`Package ${packageName} deployed successfully`)
            logEnv(provisionOutput.env, this.log.bind(this))
        }))

        logger.done(`Provisioned ${deployPackages.length} deployment packages`)
    }
}
