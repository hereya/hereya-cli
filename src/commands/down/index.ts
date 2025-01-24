import { Command, Flags } from '@oclif/core';
import { Listr, ListrLogLevels, ListrLogger } from 'listr2';

import { GetWorkspaceEnvOutput } from '../../backend/common.js';
import { getBackend } from '../../backend/index.js';
import { PackageMetadata, destroyPackage } from '../../infrastructure/index.js';
import { LoadConfigOutput } from '../../lib/config/common.js';
import { getConfigManager } from '../../lib/config/index.js';
import { getEnvManager } from '../../lib/env/index.js';
import { getParameterManager } from '../../lib/parameter/index.js';
import { delay, setDebug } from '../../lib/shell.js';

export default class Down extends Command {
    static override description = 'Destroy all packages in the project.'

    static override examples = ['<%= config.bin %> <%= command.id %>']

    static override flags = {
        chdir: Flags.string({
            description: 'directory to run command in',
            required: false,
        }),
        debug: Flags.boolean({
            default: false,
            description: 'enable debug mode',
        }),
        deploy: Flags.boolean({
            description: 'destroy deployment companion packages',
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

        setDebug(flags.debug)
        const projectRootDir = flags.chdir || process.env.HEREYA_PROJECT_ROOT_DIR

        interface Ctx {
            configOutput: Extract<LoadConfigOutput, { found: true }>
            destroyed?: { env: { [key: string]: string }; metadata: PackageMetadata; packageName: string }[]
            packages: string[]
            workspace: string
            workspaceEnvOutput: Extract<GetWorkspaceEnvOutput, { success: true }>
        }

        const myLogger = new ListrLogger({ useIcons: false })

        const task: Listr<Ctx> = new Listr([
            {
                async task(ctx, task) {
                    return task.newListr(
                        [
                            {
                                async task(ctx) {
                                    const configManager = getConfigManager()

                                    const loadConfigOutput = await configManager.loadConfig({ projectRootDir })
                                    if (!loadConfigOutput.found) {
                                        throw new Error("Project not initialized. Run 'hereya init' first.")
                                    }

                                    ctx.configOutput = loadConfigOutput
                                    await delay(500)
                                },
                                title: 'Loading project config',
                            },
                            {
                                async task(ctx) {
                                    const backend = await getBackend()
                                    const workspace = flags.workspace || ctx.configOutput.config.workspace
                                    const getWorkspaceEnvOutput = await backend.getWorkspaceEnv({
                                        project: ctx.configOutput.config.project,
                                        workspace,
                                    })
                                    if (!getWorkspaceEnvOutput.success) {
                                        throw new Error(getWorkspaceEnvOutput.reason)
                                    }

                                    ctx.workspaceEnvOutput = getWorkspaceEnvOutput
                                    ctx.workspace = workspace
                                    await delay(500)
                                },
                                title: 'Loading workspace environment variables',
                            },
                            {
                                async task(ctx) {
                                    const packages = Object.keys(ctx.configOutput.config.packages ?? {})
                                    const backend = await getBackend()
                                    const savedStateOutput = await backend.getState({
                                        project: ctx.configOutput.config.project,
                                    })
                                    let removedPackages: string[] = []
                                    if (savedStateOutput.found) {
                                        const savedPackages = Object.keys(savedStateOutput.config.packages ?? {})
                                        removedPackages = savedPackages.filter((packageName) => !packages.includes(packageName))
                                    }

                                    ctx.packages = [...packages, ...removedPackages]

                                    await delay(500)
                                },
                                title: 'Identifying packages to destroy',
                            },
                            {
                                skip: (ctx) => !ctx.packages || ctx.packages.length === 0,
                                async task(ctx) {
                                    const { configOutput, destroyed, packages, workspace, workspaceEnvOutput } = ctx
                                    if (!packages || packages.length === 0) {
                                        return
                                    }

                                    return task.newListr(
                                        packages.map((packageName) => ({
                                            async task() {
                                                const parameterManager = getParameterManager()
                                                const { parameters } = await parameterManager.getPackageParameters({
                                                    package: packageName,
                                                    projectRootDir,
                                                    workspace,
                                                })
                                                const destroyOutput = await destroyPackage({
                                                    env: workspaceEnvOutput.env,
                                                    isDeploying: flags.deploy,
                                                    package: packageName,
                                                    parameters,
                                                    project: configOutput.config.project,
                                                    workspace,
                                                })
                                                if (!destroyOutput.success) {
                                                    throw new Error(destroyOutput.reason)
                                                }

                                                const { env, metadata } = destroyOutput
                                                const output = destroyed || []
                                                output.push({ env, metadata, packageName })
                                                ctx.destroyed = output
                                            },
                                            title: `Destroying ${packageName}`,
                                        })),
                                        { concurrent: true },
                                    )
                                },
                                title: `Destroying packages`,
                            },
                            {
                                skip: (ctx) => !ctx.destroyed || ctx.destroyed.length === 0,
                                async task(ctx) {
                                    const { destroyed, workspace } = ctx
                                    if (!destroyed || destroyed.length === 0) {
                                        return
                                    }

                                    const envManager = getEnvManager()
                                    for (const { env, metadata } of destroyed) {
                                        // eslint-disable-next-line no-await-in-loop
                                        await envManager.removeProjectEnv({
                                            env,
                                            infra: metadata.originalInfra ?? metadata.infra,
                                            projectRootDir,
                                            workspace,
                                        })
                                    }

                                    await delay(500)
                                },
                                title: 'Removing env vars from destroyed packages',
                            },
                            {
                                async task() {
                                    const backend = await getBackend()
                                    const configManager = getConfigManager()
                                    const { config: newConfig } = await configManager.loadConfig({ projectRootDir })
                                    await backend.saveState(newConfig)
                                    await delay(500)
                                },
                                title: 'Saving state',
                            },
                        ],
                        { concurrent: false },
                    )
                },
                title: 'Shutting down the project',
            },
        ])

        try {
            await task.run()

            myLogger.log(ListrLogLevels.COMPLETED, 'Project shut down successfully')
        } catch (error: any) {
            myLogger.log(ListrLogLevels.FAILED, error)
            this.error(error.message)
        }
    }
}
