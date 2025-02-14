import { Args, Command, Flags } from '@oclif/core'
import { Listr, ListrLogger, ListrLogLevels } from 'listr2'

import { GetWorkspaceOutput } from '../../../backend/common.js'
import { getBackend } from '../../../backend/index.js'
import { provisionPackage, ProvisionPackageOutput } from '../../../infrastructure/index.js'
import { arrayOfStringToObject } from '../../../lib/object-utils.js'
import { delay, setDebug } from '../../../lib/shell.js'
import { load } from '../../../lib/yaml-utils.js'

export default class WorkspaceInstall extends Command {
  static override args = {
    package: Args.string({
      description: 'The package to add. Packages are gitHub repositories. Use the format owner/repository',
      required: true,
    }),
  }
static override description = 'Add a package to the workspace.'
static override examples = ['<%= config.bin %> <%= command.id %> hereya/aws-cognito']
static flags = {
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
    'parameter-file': Flags.string({
      char: 'f',
      description: 'path to a file containing parameters for the package',
    }),
    workspace: Flags.string({
      char: 'w',
      description: 'name of the workspace to add the package to',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(WorkspaceInstall)

    setDebug(flags.debug)

    interface Ctx {
      parameters: {[key: string]: string}
      provisionOutput: Extract<ProvisionPackageOutput, {success: true}>
      workspace: Extract<GetWorkspaceOutput, {found: true; hasError: false}>
    }

    const myLogger = new ListrLogger({useIcons: false})

    const task: Listr<Ctx> = new Listr(
      [
        {
          async task(ctx, task) {
            return task.newListr([
              {
                async task(ctx) {
                  const backend = await getBackend()
                  const loadWorkspaceOutput = await backend.getWorkspace(flags.workspace)
                  if (!loadWorkspaceOutput.found || loadWorkspaceOutput.hasError) {
                    throw new Error(`Workspace ${flags.workspace} not found`)
                  }

                  ctx.workspace = loadWorkspaceOutput
                  await delay(500)
                },
                title: `Loading workspace ${flags.workspace}`,
              },
              {
                async task(ctx) {
                  const parametersInCmdline = arrayOfStringToObject(flags.parameter)
                  let parametersFromFile = {}
                  if (flags['parameter-file']) {
                    const {data, found} = await load(flags['parameter-file'])
                    if (!found) {
                      throw new Error(`Parameter file ${flags['parameter-file']} not found`)
                    }

                    parametersFromFile = data
                  }

                  const parameters = {...parametersFromFile, ...parametersInCmdline}
                  ctx.parameters = parameters
                  await delay(500)
                },
                title: 'Resolving parameters',
              },
              {
                async task(ctx) {
                  const provisionOutput = await provisionPackage({
                    package: args.package,
                    parameters: ctx.parameters,
                    workspace: flags.workspace,
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
                  const backend = await getBackend()
                  const output = await backend.addPackageToWorkspace({
                    env,
                    infra: metadata.infra,
                    package: args.package,
                    parameters: ctx.parameters,
                    workspace: flags.workspace,
                  })
                  if (!output.success) {
                    throw new Error(output.reason)
                  }
                },
                title: 'Saving exported environment variables to workspace',
              },
            ])
          },
          title: `Installing ${args.package} into workspace ${flags.workspace}`,
        },
      ],
      {concurrent: false},
    )

    try {
      await task.run()

      myLogger.log(ListrLogLevels.COMPLETED, `Package ${args.package} installed successfully into workspace ${flags.workspace}`)
    } catch (error: any) {
      myLogger.log(ListrLogLevels.FAILED, error)
      this.error(error.message)
    }
  }
}
