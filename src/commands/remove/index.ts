import {Args, Command, Flags} from '@oclif/core'
import {Listr, ListrLogger, ListrLogLevels} from 'listr2'

import {GetWorkspaceEnvOutput} from '../../backend/common.js'
import {getBackend} from '../../backend/index.js'
import {destroyPackage, DestroyPackageOutput} from '../../infrastructure/index.js'
import {LoadConfigOutput} from '../../lib/config/common.js'
import {getConfigManager} from '../../lib/config/index.js'
import {getEnvManager} from '../../lib/env/index.js'
import {GetPackageParametersOutput, getParameterManager} from '../../lib/parameter/index.js'
import {delay, setDebug} from '../../lib/shell.js'

export default class Remove extends Command {
  static override args = {
    package: Args.string({
      description: 'The package to remove. Packages are gitHub repositories. Use the format owner/repository',
      required: true,
    }),
  }
static override description = 'Remove a package from the project.'
static override examples = ['<%= config.bin %> <%= command.id %> cloudy/docker_postgres']
static override flags = {
    chdir: Flags.string({
      description: 'directory to run command in',
      required: false,
    }),
    debug: Flags.boolean({
      default: false,
      description: 'enable debug mode',
    }),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Remove)

    setDebug(flags.debug)
    const projectRootDir = flags.chdir || process.env.HEREYA_PROJECT_ROOT_DIR

    interface Ctx {
      configOutput: Extract<LoadConfigOutput, {found: true}>
      destroyOutput: Extract<DestroyPackageOutput, {success: true}>
      package: string
      parametersOutput: GetPackageParametersOutput
      workspaceEnvOutput: Extract<GetWorkspaceEnvOutput, {success: true}>
    }

    const myLogger = new ListrLogger({useIcons: false})

    const task: Listr<Ctx> = new Listr([
      {
        async task(ctx, task) {
          return task.newListr([
            {
              async task(ctx) {
                ctx.package = args.package
              },
            },
            {
              async task(ctx) {
                const configManager = getConfigManager()
                const loadConfigOutput = await configManager.loadConfig({projectRootDir})
                if (!loadConfigOutput.found) {
                  throw new Error("Project not initialized. Run 'hereya init' first.")
                }

                ctx.configOutput = loadConfigOutput
                const {config} = loadConfigOutput
                if (!(ctx.package in (config.packages ?? {})) && !(ctx.package in (config.deploy ?? {}))) {
                  throw new Error(`Package ${ctx.package} not found in the project.`)
                }

                await delay(500)
              },
              title: 'Loading project config',
            },
            {
              async task(ctx) {
                const backend = await getBackend()
                const getWorkspaceEnvOutput = await backend.getWorkspaceEnv({
                  project: ctx.configOutput.config.project,
                  workspace: ctx.configOutput.config.workspace,
                })
                if (!getWorkspaceEnvOutput.success) {
                  throw new Error(getWorkspaceEnvOutput.reason)
                }

                ctx.workspaceEnvOutput = getWorkspaceEnvOutput
                await delay(500)
              },
              title: 'Loading workspace environment variables',
            },
            {
              async task(ctx) {
                const parameterManager = getParameterManager()
                const parametersOutput = await parameterManager.getPackageParameters({
                  package: ctx.package,
                  projectRootDir,
                  workspace: ctx.configOutput.config.workspace,
                })
                ctx.parametersOutput = parametersOutput
                await delay(500)
              },
              title: 'Resolving package parameters',
            },
            {
              async task(ctx) {
                const destroyOutput = await destroyPackage({
                  env: ctx.workspaceEnvOutput.env,
                  package: ctx.package,
                  parameters: ctx.parametersOutput.parameters,
                  project: ctx.configOutput.config.project,
                  skipDeploy: true,
                  workspace: ctx.configOutput.config.workspace,
                })

                if (!destroyOutput.success) {
                  throw new Error(destroyOutput.reason)
                }

                ctx.destroyOutput = destroyOutput
              },
              title: 'Destroying package',
            },
            {
              async task(ctx) {
                const envManager = getEnvManager()
                await envManager.removeProjectEnv({
                  env: ctx.destroyOutput.env,
                  infra: ctx.destroyOutput.metadata.infra,
                  projectRootDir,
                  workspace: ctx.configOutput.config.workspace,
                })
                await delay(500)
              },
              title: 'Removing package env vars from project',
            },
            {
              async task(ctx) {
                const configManager = getConfigManager()
                await configManager.removePackage({
                  metadata: ctx.destroyOutput.metadata,
                  package: ctx.package,
                  projectRootDir,
                })
                await delay(500)
              },
              title: 'Removing package from hereya manifest',
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
          ])
        },
        title: `Removing ${args.package}`,
      },
    ])

    try {
      await task.run()

      myLogger.log(ListrLogLevels.COMPLETED, 'Package removed successfully')
    } catch (error: any) {
      myLogger.log(ListrLogLevels.FAILED, error)
      this.error(error.message)
    }
  }
}
