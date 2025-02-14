import {Command, Flags} from '@oclif/core'
import {Listr, ListrLogger, ListrLogLevels} from 'listr2'
import path from 'node:path'

import {GetStateOutput} from '../../backend/common.js'
import {getBackend} from '../../backend/index.js'
import {destroyPackage, PackageMetadata, provisionPackage} from '../../infrastructure/index.js'
import {getConfigManager} from '../../lib/config/index.js'
import {getEnvManager} from '../../lib/env/index.js'
import {getParameterManager} from '../../lib/parameter/index.js'
import {delay, setDebug} from '../../lib/shell.js'

export default class Deploy extends Command {
  static override description = 'Deploy a hereya project using the project deployment package'
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
    workspace: Flags.string({
      char: 'w',
      description: 'name of the workspace to deploy the packages for',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(Deploy)

    setDebug(flags.debug)
    const projectRootDir = path.resolve(flags.chdir || process.env.HEREYA_PROJECT_ROOT_DIR || process.cwd())

    interface Ctx {
      added?: {env: {[key: string]: string}; metadata: PackageMetadata; packageName: string}[]
      configOutput: {config: any}
      deployPackages: string[]
      packages: string[]
      projectEnv: {[key: string]: string}
      removed?: {env: {[key: string]: string}; metadata: PackageMetadata; packageName: string}[]
      removedDeployPackages: string[]
      removedPackages: string[]
      savedStateOutput?: Extract<GetStateOutput, {found: true}>
      workspace: string
      workspaceEnv: {[key: string]: string}
    }

    const myLogger = new ListrLogger({useIcons: false})

    const task: Listr<Ctx> = new Listr([
      {
        async task(ctx) {
          const configManager = getConfigManager()
          const loadConfigOutput = await configManager.loadConfig({projectRootDir})
          if (!loadConfigOutput.found) {
            throw new Error("Project not initialized. Run 'hereya init' first.")
          }

          ctx.configOutput = loadConfigOutput
          ctx.deployPackages = Object.keys(loadConfigOutput.config.deploy ?? {})
          ctx.packages = Object.keys(loadConfigOutput.config.packages ?? {})

          await delay(500)
        },
        title: 'Loading project config',
      },

      {
        async task(ctx) {
          const backend = await getBackend()
          const getWorkspaceEnvOutput = await backend.getWorkspaceEnv({
            project: ctx.configOutput.config.project,
            workspace: flags.workspace,
          })
          if (!getWorkspaceEnvOutput.success) {
            throw new Error(getWorkspaceEnvOutput.reason)
          }

          ctx.workspaceEnv = getWorkspaceEnvOutput.env
          ctx.workspace = flags.workspace

          await delay(500)
        },
        title: 'Loading workspace environment variables',
      },
      {
        async task(ctx) {
          const envManager = getEnvManager()
          const {env: projectEnv} = await envManager.getProjectEnv({
            markSecret: true,
            projectRootDir,
            workspace: ctx.workspace,
          })
          ctx.projectEnv = projectEnv

          await delay(500)
        },
        title: 'Loading project environment variables',
      },

      {
        async task(ctx) {
          const backend = await getBackend()
          const savedStateOutput = await backend.getState({
            project: ctx.configOutput.config.project,
            workspace: ctx.workspace,
          })
          if (savedStateOutput.found) {
            ctx.savedStateOutput = savedStateOutput
          }

          await delay(500)
        },
        title: 'Loading project current state',
      },

      {
        async task(ctx) {
          const savedDeployPackages = Object.keys(ctx.savedStateOutput?.config.deploy ?? {})
          ctx.removedDeployPackages = savedDeployPackages.filter(
            (packageName) => !ctx.deployPackages.includes(packageName),
          )

          const savedPackages = Object.keys(ctx.savedStateOutput?.config.packages ?? {})
          ctx.removedPackages = savedPackages.filter((packageName) => !ctx.packages.includes(packageName))

          await delay(500)
        },
        title: 'Identifying removed packages',
      },

      {
        skip: (ctx) => ctx.removedDeployPackages.length === 0,
        task(ctx, task) {
          return task.newListr(
            ctx.removedDeployPackages.map((packageName) => ({
              async task() {
                const parameterManager = getParameterManager()
                const {parameters} = await parameterManager.getPackageParameters({
                  package: packageName,
                  projectRootDir,
                  workspace: ctx.workspace,
                })
                const destroyOutput = await destroyPackage({
                  env: ctx.workspaceEnv,
                  isDeploying: true,
                  package: packageName,
                  parameters,
                  project: ctx.configOutput.config.project,
                  projectEnv: ctx.projectEnv,
                  projectRootDir,
                  workspace: ctx.workspace,
                })
                if (!destroyOutput.success) {
                  throw new Error(destroyOutput.reason)
                }
              },
              title: `Destroying package ${packageName}`,
            })),
            {concurrent: true},
          )
        },
        title: 'Destroying removed deployment packages',
      },
      {
        skip: (ctx) => ctx.removedPackages.length === 0,
        task(ctx, task) {
          return task.newListr(
            ctx.removedPackages.map((packageName) => ({
              async task() {
                const parameterManager = getParameterManager()
                const {parameters} = await parameterManager.getPackageParameters({
                  package: packageName,
                  projectRootDir,
                  workspace: ctx.workspace,
                })
                const destroyOutput = await destroyPackage({
                  env: ctx.workspaceEnv,
                  isDeploying: true,
                  package: packageName,
                  parameters,
                  project: ctx.configOutput.config.project,
                  workspace: ctx.workspace,
                })
                if (!destroyOutput.success) {
                  throw new Error(destroyOutput.reason)
                }

                const {env, metadata} = destroyOutput
                const output = ctx.removed || []
                output.push({env, metadata, packageName})
                ctx.removed = output
              },
              title: `Destroying ${packageName}`,
            })),
            {concurrent: true},
          )
        },
        title: 'Destroying removed packages',
      },
      {
        skip: (ctx) => !ctx.packages || ctx.packages.length === 0,
        async task(ctx, task) {
          if (!ctx.packages || ctx.packages.length === 0) {
            return
          }

          return task.newListr(
            ctx.packages.map((packageName) => ({
              async task() {
                const parameterManager = getParameterManager()
                const {parameters} = await parameterManager.getPackageParameters({
                  package: packageName,
                  projectRootDir,
                  workspace: ctx.workspace,
                })
                const provisionOutput = await provisionPackage({
                  env: ctx.workspaceEnv,
                  isDeploying: true,
                  package: packageName,
                  parameters,
                  project: ctx.configOutput.config.project,
                  workspace: ctx.workspace,
                })
                if (!provisionOutput.success) {
                  throw new Error(provisionOutput.reason)
                }

                const {env, metadata} = provisionOutput
                const output = ctx.added || []
                output.push({env, metadata, packageName})
                ctx.added = output
              },
              title: `Provisioning ${packageName}`,
            })),
            {concurrent: true},
          )
        },
        title: `Provisioning packages`,
      },
      {
        skip: (ctx) => !ctx.removed || ctx.removed.length === 0,
        async task(ctx) {
          if (!ctx.removed || ctx.removed.length === 0) {
            return
          }

          const envManager = getEnvManager()
          for (const {env, metadata} of ctx.removed) {
            // eslint-disable-next-line no-await-in-loop
            await envManager.removeProjectEnv({
                env,
                infra: metadata.originalInfra ?? metadata.infra,
                projectRootDir,
                workspace: ctx.workspace,
              })
          }

          await delay(500)
        },
        title: 'Removing env vars from removed packages',
      },
      {
        skip: (ctx) => !ctx.added || ctx.added.length === 0,
        async task(ctx) {
          if (!ctx.added || ctx.added.length === 0) {
            return
          }

          const envManager = getEnvManager()

          for (const {env, metadata} of ctx.added) {
            // eslint-disable-next-line no-await-in-loop
            await envManager.addProjectEnv({
              env,
              infra: metadata.originalInfra ?? metadata.infra,
              projectRootDir,
              workspace: ctx.workspace,
            })
          }

          await delay(500)
        },
        title: 'Adding env vars from added packages',
      },
      {
        async task(ctx) {
          const backend = await getBackend()
          const configManager = getConfigManager()
          const {config: newConfig} = await configManager.loadConfig({projectRootDir})
          await backend.saveState(newConfig, ctx.workspace)
          await delay(500)
        },
        title: 'Saving state',
      },
      {
        skip: (ctx) => ctx.deployPackages.length === 0,
        async task(ctx, task) {
          const envManager = getEnvManager()
          const {env: projectEnv} = await envManager.getProjectEnv({
            markSecret: true,
            projectRootDir,
            workspace: ctx.workspace,
          })
          return task.newListr(
            ctx.deployPackages.map((packageName) => ({
              async task() {
                const parameterManager = getParameterManager()
                const {parameters} = await parameterManager.getPackageParameters({
                  package: packageName,
                  projectRootDir,
                  workspace: ctx.workspace,
                })
                const provisionOutput = await provisionPackage({
                  env: ctx.workspaceEnv,
                  isDeploying: true,
                  package: packageName,
                  parameters,
                  project: ctx.configOutput.config.project,
                  projectEnv,
                  projectRootDir,
                  workspace: ctx.workspace,
                })
                if (!provisionOutput.success) {
                  throw new Error(provisionOutput.reason)
                }

                console.log(
                  Object.entries(provisionOutput.env)
                    .map(([key, value]) => `${key}=${value}`)
                    .join('\n'),
                )
              },
              title: `Provisioning package ${packageName}`,
            })),
            {concurrent: true},
          )
        },
        title: 'Provisioning deployment packages',
      },
    ])

    try {
      await task.run()
      myLogger.log(ListrLogLevels.COMPLETED, 'Deployment completed successfully')
    } catch (error: any) {
      myLogger.log(ListrLogLevels.FAILED, error)
      this.error(error.message)
    }
  }
}
