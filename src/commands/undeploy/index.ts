import {Command, Flags} from '@oclif/core'
import {Listr, ListrLogLevels, ListrLogger} from 'listr2'
import path from 'node:path'

import {GetStateOutput} from '../../backend/common.js'
import {getBackend} from '../../backend/index.js'
import {PackageMetadata, destroyPackage} from '../../infrastructure/index.js'
import {LoadConfigOutput} from '../../lib/config/common.js'
import {getConfigManager} from '../../lib/config/index.js'
import {getEnvManager} from '../../lib/env/index.js'
import {getParameterManager} from '../../lib/parameter/index.js'
import {delay, setDebug} from '../../lib/shell.js'

export default class Undeploy extends Command {
  static override description = 'Undeploy a hereya project by removing all resources.'

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
      description: 'name of the workspace to undeploy the packages for',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(Undeploy)

    setDebug(flags.debug)
    const projectRootDir = path.resolve(flags.chdir || process.env.HEREYA_PROJECT_ROOT_DIR || process.cwd())

    interface Ctx {
      configOutput: Extract<LoadConfigOutput, {found: true}>
      deployPackages: string[]
      destroyed: {env: {[key: string]: string}; metadata: PackageMetadata; packageName: string}[]
      packages: string[]
      projectEnv: {[key: string]: string}
      savedStateOutput?: Extract<GetStateOutput, {found: true}>
      workspace: string
      workspaceEnv: {[key: string]: string}
    }

    const myLogger = new ListrLogger({useIcons: false})

    const task: Listr<Ctx> = new Listr([
      {
        async task(ctx, task) {
          return task.newListr(
            [
              {
                async task(ctx) {
                  const configManager = getConfigManager()
                  const loadConfigOutput = await configManager.loadConfig({projectRootDir})
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
                  const {workspace} = flags
                  const getWorkspaceEnvOutput = await backend.getWorkspaceEnv({
                    project: ctx.configOutput.config.project,
                    workspace,
                  })
                  if (!getWorkspaceEnvOutput.success) {
                    throw new Error(getWorkspaceEnvOutput.reason)
                  }

                  ctx.workspaceEnv = getWorkspaceEnvOutput.env
                  ctx.workspace = workspace

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
                  const deployPackages = Object.keys(ctx.configOutput.config.deploy ?? {})
                  const savedDeployPackages = Object.keys(ctx.savedStateOutput?.config.deploy ?? {})
                  const removedDeployPackages = savedDeployPackages.filter(
                    (packageName) => !deployPackages.includes(packageName),
                  )
                  ctx.deployPackages = [...removedDeployPackages, ...deployPackages]

                  const packages = Object.keys(ctx.configOutput.config.packages ?? {})
                  const savedPackages = Object.keys(ctx.savedStateOutput?.config.packages ?? {})
                  const removedPackages = savedPackages.filter((packageName) => !packages.includes(packageName))

                  ctx.packages = [...removedPackages, ...packages]

                  await delay(500)
                },
                title: 'Identifying removed packages',
              },
              {
                skip: (ctx) => ctx.deployPackages.length === 0,
                async task(ctx, task) {
                  return task.newListr(
                    ctx.deployPackages.map((packageName) => ({
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
                    {concurrent: false},
                  )
                },
                title: 'Destroying deployment packages',
              },
              {
                skip: (ctx) => !ctx.packages || ctx.packages.length === 0,
                async task(ctx, task) {
                  return task.newListr(
                    ctx.packages.map((packageName) => ({
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
                        const output = ctx.destroyed || []
                        output.push({env, metadata, packageName})
                        ctx.destroyed = output
                      },
                      title: `Destroying ${packageName}`,
                    })),
                    {concurrent: true},
                  )
                },
                title: `Destroying packages`,
              },
              {
                skip: (ctx) => !ctx.destroyed || ctx.destroyed.length === 0,
                async task(ctx) {
                  const {destroyed, workspace} = ctx
                  if (!destroyed || destroyed.length === 0) {
                    return
                  }

                  const envManager = getEnvManager()
                  for (const {env, metadata} of destroyed) {
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
                async task(ctx) {
                  const backend = await getBackend()
                  const configManager = getConfigManager()
                  const {config: newConfig} = await configManager.loadConfig({projectRootDir})
                  await backend.saveState(newConfig, ctx.workspace)
                  await delay(500)
                },
                title: 'Saving state',
              },
            ],
            {concurrent: false},
          )
        },
      },
    ])

    try {
      await task.run()

      myLogger.log(ListrLogLevels.COMPLETED, 'Project undeployed successfully')
    } catch (error: any) {
      myLogger.log(ListrLogLevels.FAILED, error)
      this.error(error.message)
    }
  }
}
