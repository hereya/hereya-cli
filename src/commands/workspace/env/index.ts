import {Args, Command, Flags} from '@oclif/core'

import {getBackend} from '../../../backend/index.js'
import {logEnv} from '../../../lib/env-utils.js'

export default class WorkspaceEnv extends Command {
  static override args = {
    name: Args.string({description: 'name of the env to display', required: false}),
  }
static override description = 'Print workspace env vars.'
static override examples = [
    '<%= config.bin %> <%= command.id %> -w dev',
    '<%= config.bin %> <%= command.id %> myEnv -w dev',
  ]
static override flags = {
    list: Flags.boolean({
      char: 'l',
      description: 'list only the env vars without values',
      required: false,
    }),

    workspace: Flags.string({
      char: 'w',
      description: 'name of the workspace to print env vars for',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(WorkspaceEnv)

    const backend = await getBackend()
    const getWorkspaceEnvOutput = await backend.getWorkspaceEnv({
      workspace: flags.workspace,
    })
    if (!getWorkspaceEnvOutput.success) {
      this.error(getWorkspaceEnvOutput.reason)
    }

    const {env} = getWorkspaceEnvOutput
    if (args.name) {
      if (env[args.name] === undefined) {
        this.error(`Env var ${args.name} not found`)
      }

      this.log(env[args.name])
      return
    }

    if (flags.list) {
      this.log(Object.keys(env).join('\n'))
      return
    }

    logEnv(env)
  }
}
