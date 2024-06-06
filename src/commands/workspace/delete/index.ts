import { Args, Command } from '@oclif/core'

import { getBackend } from '../../../backend/index.js';

export default class WorkspaceDelete extends Command {
    static override args = {
        name: Args.string({ description: 'name of the workspace to delete', required: true }),
    }

    static override description = 'Delete a workspace if it exists.'

    static override examples = [
        '<%= config.bin %> <%= command.id %> dev',
    ]

    public async run(): Promise<void> {
        const { args } = await this.parse(WorkspaceDelete)

        const backend = await getBackend()
        const output = await backend.deleteWorkspace({ name: args.name })
        if (!output.success) {
            this.error(`Failed to delete workspace: ${output.reason}`)
        }

        if (output.message) {
            this.log(output.message)
            return
        }

        this.log(`Workspace ${args.name} deleted successfully!`)
    }
}
