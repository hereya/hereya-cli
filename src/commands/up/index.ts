import {Command, Flags} from '@oclif/core'
import {Listr, ListrLogLevels, ListrLogger} from 'listr2'

import {GetStateOutput, GetWorkspaceEnvOutput} from '../../backend/common.js'
import {getBackend} from '../../backend/index.js'
import {PackageMetadata, destroyPackage, provisionPackage} from '../../infrastructure/index.js'
import {LoadConfigOutput} from '../../lib/config/common.js'
import {getConfigManager} from '../../lib/config/index.js'
import {getEnvManager} from '../../lib/env/index.js'
import {getParameterManager} from '../../lib/parameter/index.js'
import {delay, setDebug} from '../../lib/shell.js'

export default class Up extends Command {
  static override description = 'Provision all packages in the project.'

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
    const {flags} = await this.parse(Up)

    setDebug(flags.debug)
    const projectRootDir = flags.chdir || process.env.HEREYA_PROJECT_ROOT_DIR

    interface Ctx {
      added?: {env: {[key: string]: string}; metadata: PackageMetadata; packageName: string}[]
      configOutput: Extract<LoadConfigOutput, {found: true}>
      packages: string[]
      removed?: {env: {[key: string]: string}; metadata: PackageMetadata; packageName: string}[]
      removedPackages: string[]
      savedStateOutput: Extract<GetStateOutput, {found: true}>
      workspace: string
      workspaceEnvOutput: Extract<GetWorkspaceEnvOutput, {success: true}>
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
                  const backend = await getBackend()
                  const savedStateOutput = await backend.getState({
                    project: ctx.configOutput.config.project,
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
                  const packages = Object.keys(ctx.configOutput.config.packages ?? {})
                  const savedPackages = Object.keys(ctx.savedStateOutput?.config?.packages ?? {})
                  const removedPackages = savedPackages.filter((packageName) => !packages.includes(packageName))
                  ctx.removedPackages = removedPackages
                  ctx.packages = packages

                  await delay(500)
                },
                title: 'Searching for removed packages',
              },
              {
                skip: (ctx) => !ctx.removedPackages || ctx.removedPackages.length === 0,
                async task(ctx) {
                  const {configOutput, removed, removedPackages, workspace, workspaceEnvOutput} = ctx
                  if (!removedPackages || removedPackages.length === 0) {
                    return
                  }

                  return task.newListr(
                    removedPackages.map((packageName) => ({
                      async task() {
                        const parameterManager = getParameterManager()
                        const {parameters} = await parameterManager.getPackageParameters({
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

                        const {env, metadata} = destroyOutput
                        const output = removed || []
                        output.push({env, metadata, packageName})
                        ctx.removed = output
                      },
                      title: `Destroying ${packageName}`,
                    })),
                    {concurrent: true},
                  )
                },
                title: `Destroying removed packages`,
              },
              {
                skip: (ctx) => !ctx.packages || ctx.packages.length === 0,
                async task(ctx) {
                  const {added, configOutput, packages, workspace, workspaceEnvOutput} = ctx
                  if (!packages || packages.length === 0) {
                    return
                  }

                  return task.newListr(
                    packages.map((packageName) => ({
                      async task() {
                        const parameterManager = getParameterManager()
                        const {parameters} = await parameterManager.getPackageParameters({
                          package: packageName,
                          projectRootDir,
                          workspace,
                        })
                        const provisionOutput = await provisionPackage({
                          env: workspaceEnvOutput.env,
                          isDeploying: flags.deploy,
                          package: packageName,
                          parameters,
                          project: configOutput.config.project,
                          workspace,
                        })
                        if (!provisionOutput.success) {
                          throw new Error(provisionOutput.reason)
                        }

                        const {env, metadata} = provisionOutput
                        const output = added || []
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
                  const {removed, workspace} = ctx
                  if (!removed || removed.length === 0) {
                    return
                  }

                  const envManager = getEnvManager()
                  for (const {env, metadata} of removed) {
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

                  await delay(500)
                },
                title: 'Removing env vars from removed packages',
              },
              {
                skip: (ctx) => !ctx.added || ctx.added.length === 0,
                async task(ctx) {
                  const {added, workspace} = ctx
                  if (!added || added.length === 0) {
                    return
                  }

                  const envManager = getEnvManager()

                  for (const {env, metadata} of added) {
                    // eslint-disable-next-line no-await-in-loop
                    await envManager.addProjectEnv({
                      env,
                      infra: metadata.originalInfra ?? metadata.infra,
                      projectRootDir,
                      workspace,
                    })
                  }

                  await delay(500)
                },
                title: 'Adding env vars to added packages',
              },
              {
                async task() {
                  const backend = await getBackend()
                  const configManager = getConfigManager()
                  const {config: newConfig} = await configManager.loadConfig({projectRootDir})
                  await backend.saveState(newConfig)
                  await delay(500)
                },
                title: 'Saving state',
              },
            ],
            {concurrent: false},
          )
        },
        title: 'Waking up the project',
      },
    ])

    try {
      await task.run()

      myLogger.log(ListrLogLevels.COMPLETED, 'Project waked up successfully')
    } catch (error: any) {
      myLogger.log(ListrLogLevels.FAILED, error)
      this.error(error.message)
    }

    // const configManager = getConfigManager()

    // const loadConfigOutput = await configManager.loadConfig({projectRootDir})
    // if (!loadConfigOutput.found) {
    //   this.warn(`Project not initialized. Run 'hereya init' first.`)
    //   return
    // }

    // const {config} = loadConfigOutput
    // const packages = Object.keys(config.packages ?? {})
    // const backend = await getBackend()
    // const savedStateOutput = await backend.getState({
    //   project: config.project,
    // })
    // let savedPackages: string[] = []
    // if (savedStateOutput.found) {
    //   savedPackages = Object.keys(savedStateOutput.config.packages ?? {})
    // }

    // const removedPackages = savedPackages.filter((packageName) => !packages.includes(packageName))

    // const workspace = flags.workspace || config.workspace
    // const getWorkspaceEnvOutput = await backend.getWorkspaceEnv({
    //   project: config.project,
    //   workspace,
    // })
    // if (!getWorkspaceEnvOutput.success) {
    //   this.error(getWorkspaceEnvOutput.reason)
    // }

    // const {env: workspaceEnv} = getWorkspaceEnvOutput

    // const parameterManager = getParameterManager()

    // if (removedPackages.length > 0) {
    //   logger.log(`Destroying ${removedPackages.length} removed packages`)
    // }

    // const removed = await Promise.all(
    //   removedPackages.map(async (packageName) => {
    //     const {parameters} = await parameterManager.getPackageParameters({
    //       package: packageName,
    //       projectRootDir,
    //       workspace,
    //     })
    //     const destroyOutput = await destroyPackage({
    //       env: workspaceEnv,
    //       isDeploying: flags.deploy,
    //       package: packageName,
    //       parameters,
    //       project: config.project,
    //       workspace,
    //     })
    //     if (!destroyOutput.success) {
    //       this.error(destroyOutput.reason)
    //     }

    //     const {env, metadata} = destroyOutput
    //     return {env, metadata, packageName}
    //   }),
    // )

    // if (removedPackages.length > 0) {
    //   logger.done(`Destroyed ${removedPackages.length} removed packages`)
    // }

    // logger.log(`Provisioning ${packages.length} packages`)
    // const added = await Promise.all(
    //   packages.map(async (packageName) => {
    //     const {parameters} = await parameterManager.getPackageParameters({
    //       package: packageName,
    //       projectRootDir,
    //       workspace,
    //     })
    //     const provisionOutput = await provisionPackage({
    //       env: workspaceEnv,
    //       isDeploying: flags.deploy,
    //       package: packageName,
    //       parameters,
    //       project: config.project,
    //       workspace,
    //     })
    //     if (!provisionOutput.success) {
    //       this.error(provisionOutput.reason)
    //     }

    //     const {env, metadata} = provisionOutput
    //     return {env, metadata, packageName}
    //   }),
    // )

    // logger.done(`Provisioned ${packages.length} packages`)

    // const envManager = getEnvManager()
    // for (const {env, metadata} of removed) {
    //   // eslint-disable-next-line no-await-in-loop
    //   await Promise.all([
    //     envManager.removeProjectEnv({
    //       env,
    //       infra: metadata.originalInfra ?? metadata.infra,
    //       projectRootDir,
    //       workspace,
    //     }),
    //   ])
    // }

    // if (removedPackages.length > 0) {
    //   logger.done(`Removed env vars from ${removedPackages.length} removed packages`)
    // }

    // for (const {env, metadata} of added) {
    //   // eslint-disable-next-line no-await-in-loop
    //   await envManager.addProjectEnv({
    //     env,
    //     infra: metadata.originalInfra ?? metadata.infra,
    //     projectRootDir,
    //     workspace,
    //   })
    // }

    // logger.done('Saved exported environment variables')

    // const {config: newConfig} = await configManager.loadConfig({projectRootDir})
    // await backend.saveState(newConfig)
  }
}
