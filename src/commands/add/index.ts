import {Args, Command, Flags} from '@oclif/core'
import {Listr, ListrLogLevels, ListrLogger} from 'listr2'

import {GetWorkspaceEnvOutput} from '../../backend/common.js'
import {getBackend} from '../../backend/index.js'
import {ProvisionPackageOutput, provisionPackage} from '../../infrastructure/index.js'
import {LoadConfigOutput} from '../../lib/config/common.js'
import {getConfigManager} from '../../lib/config/index.js'
import {getEnvManager} from '../../lib/env/index.js'
import {logEnv} from '../../lib/env-utils.js'
import {arrayOfStringToObject} from '../../lib/object-utils.js'
import {GetPackageParametersOutput, getParameterManager} from '../../lib/parameter/index.js'
import {delay, setDebug} from '../../lib/shell.js'

export default class Add extends Command {
  static override args = {
    package: Args.string({
      description: 'The package to add. Packages are gitHub repositories. Use the format owner/repository',
      required: true,
    }),
  }

  static override description = 'Add a package to the project.'

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
    parameter: Flags.string({
      char: 'p',
      default: [],
      description: "parameter for the package, in the form of 'key=value'. Can be specified multiple times.",
      multiple: true,
    }),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Add)

    setDebug(flags.debug)
    const projectRootDir = flags.chdir || process.env.HEREYA_PROJECT_ROOT_DIR

    interface Ctx {
      configOutput: Extract<LoadConfigOutput, {found: true}>
      package: string
      parametersOutput: GetPackageParametersOutput
      provisionOutput: Extract<ProvisionPackageOutput, {success: true}>
      userSpecifiedParameters: string[]
      workspaceEnvOutput: Extract<GetWorkspaceEnvOutput, {success: true}>
    }

    const myLogger = new ListrLogger({useIcons: false})

    const task: Listr<Ctx> = new Listr(
      [
        {
          async task(ctx, task) {
            return task.newListr(
              [
                {
                  async task(ctx) {
                    ctx.package = args.package
                    ctx.userSpecifiedParameters = flags.parameter
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
                  title: 'Loading Workspace environment variables',
                },
                {
                  async task(ctx) {
                    const userSpecifiedParameters = arrayOfStringToObject(ctx.userSpecifiedParameters)
                    const parameterManager = getParameterManager()
                    const parametersOutput = await parameterManager.getPackageParameters({
                      package: ctx.package,
                      projectRootDir,
                      userSpecifiedParameters,
                      workspace: ctx.configOutput.config.workspace,
                    })
                    ctx.parametersOutput = parametersOutput
                    await delay(500)
                  },
                  title: 'Resolving package parameters',
                },
                {
                  async task(ctx) {
                    const provisionOutput = await provisionPackage({
                      env: ctx.workspaceEnvOutput.env,
                      package: ctx.package,
                      parameters: ctx.parametersOutput.parameters,
                      project: ctx.configOutput.config.project,
                      skipDeploy: true,
                      workspace: ctx.configOutput.config.workspace,
                    })
                    if (!provisionOutput.success) {
                      throw new Error(provisionOutput.reason)
                    }

                    ctx.provisionOutput = provisionOutput
                  },
                  title: 'Provisioning package',
                },
                {
                  async task(ctx) {
                    const {env, metadata} = ctx.provisionOutput
                    const envManager = getEnvManager()
                    await envManager.addProjectEnv({
                      env,
                      infra: metadata.originalInfra ?? metadata.infra,
                      projectRootDir,
                      workspace: ctx.configOutput.config.workspace,
                    })
                    await delay(500)
                  },
                  title: 'Saving exported environment variables',
                },
                {
                  async task(ctx) {
                    const configManager = getConfigManager()
                    await configManager.addPackage({
                      metadata: ctx.provisionOutput.metadata,
                      package: ctx.package,
                      projectRootDir,
                    })
                    await delay(500)
                  },
                  title: 'Adding package to hereya manifest',
                },
                {
                  async task(ctx) {
                    const backend = await getBackend()
                    const configManager = getConfigManager()
                    const {config: newConfig} = await configManager.loadConfig({projectRootDir})
                    await backend.saveState(newConfig)
                    const parameterManager = getParameterManager()
                    const {filePath, saved} = await parameterManager.savePackageParameters({
                      package: ctx.package,
                      parameters: ctx.parametersOutput.parameters,
                      projectRootDir,
                      workspace: ctx.configOutput.config.workspace,
                    })

                    await delay(500)
                    
                    if (saved) {
                      myLogger.log(
                        ListrLogLevels.COMPLETED,
                        `Saved the following parameters for the package in ${filePath}:`,
                      )
                      logEnv(ctx.parametersOutput.parameters, (msg) => myLogger.log(ListrLogLevels.COMPLETED, msg))
                    }
                  },
                  title: 'Saving state',
                },
              ],
              {concurrent: false},
            )
          },
          title: `Adding ${args.package}`,
        },
      ],
      {concurrent: false},
    )

    try {
      await task.run()

      myLogger.log(ListrLogLevels.COMPLETED, 'Package added successfully')
    } catch (error: any) {
      myLogger.log(ListrLogLevels.FAILED, error)
      this.error(error.message)
    }
  }
}
