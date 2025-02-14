import {Command, Flags} from '@oclif/core'

import {getBackend} from '../../../../backend/index.js'
import {InfrastructureType} from '../../../../infrastructure/common.js'

export default class WorkspaceEnvSet extends Command {
  static override description = 'set an env var for a workspace'
static override examples = ['<%= config.bin %> <%= command.id %> -w my-workspace -n myVar -v my-value -i aws -s']
static override flags = {
    infra: Flags.string({char: 'i', description: 'the infrastructure to store the env var in', required: true}),
    name: Flags.string({char: 'n', description: 'name of the env var to set', required: true}),
    sensitive: Flags.boolean({char: 's', description: 'whether the env var is sensitive'}),
    value: Flags.string({char: 'v', description: 'value of the env var to set', required: true}),
    workspace: Flags.string({
      char: 'w',
      description: 'name of the workspace to set an env var for',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(WorkspaceEnvSet)

    const backend = await getBackend()
    const getWorkspaceOutput = await backend.getWorkspace(flags.workspace)
    if (!getWorkspaceOutput.found) {
      this.error(`Workspace ${flags.workspace} not found`)
    }

    if (getWorkspaceOutput.hasError) {
      this.error(getWorkspaceOutput.error)
    }

    const setEnvVarOutput = await backend.setEnvVar({
      infra: flags.infra as InfrastructureType,
      name: flags.name,
      sensitive: flags.sensitive,
      value: flags.value,
      workspace: flags.workspace,
    })
    if (!setEnvVarOutput.success) {
      this.error(setEnvVarOutput.reason)
    }

    this.log(`Env var ${flags.name} set for workspace ${flags.workspace}`)
  }
}
