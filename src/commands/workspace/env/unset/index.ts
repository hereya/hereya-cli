import {Command, Flags} from '@oclif/core'

import {getBackend} from '../../../../backend/index.js'

export default class WorkspaceEnvUnset extends Command {
  static override description = 'unset an env var for a workspace'
static override examples = ['<%= config.bin %> <%= command.id %> -w my-workspace -n myVar']
static override flags = {
    name: Flags.string({char: 'n', description: 'name of the env var to unset', required: true}),
    workspace: Flags.string({
      char: 'w',
      description: 'name of the workspace to unset an env var for',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(WorkspaceEnvUnset)

    const backend = await getBackend()
    const getWorkspaceOutput = await backend.getWorkspace(flags.workspace)
    if (!getWorkspaceOutput.found) {
      this.error(`Workspace ${flags.workspace} not found`)
    }

    if (getWorkspaceOutput.hasError) {
      this.error(getWorkspaceOutput.error)
    }

    const unsetEnvVarOutput = await backend.unsetEnvVar({
      name: flags.name,
      workspace: flags.workspace,
    })
    if (!unsetEnvVarOutput.success) {
      this.error(unsetEnvVarOutput.reason)
    }

    this.log(`Unset env var ${flags.name} for workspace ${flags.workspace}`)
  }
}
