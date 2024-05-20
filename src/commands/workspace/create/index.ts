import { Args, Command } from '@oclif/core'

import { getBackend } from '../../../backend/index.js';

export default class WorkspaceCreate extends Command {
    static override args = {
        name: Args.string({ description: 'name of the workspace to create', required: true }),
    }

    static override description = 'creates a new workspace if it does not exist'

    static override examples = [
        '<%= config.bin %> <%= command.id %> dev',
    ]


    public async run(): Promise<void> {
        const { args } = await this.parse(WorkspaceCreate)

        const backend = await getBackend()

        const createWorkspaceOutput = await backend.createWorkspace({ name: args.name })
        if (!createWorkspaceOutput.success) {
            this.error(`Failed to create workspace: ${createWorkspaceOutput.reason}`)
        }

        if (createWorkspaceOutput.isNew) {
            this.log(`Workspace ${createWorkspaceOutput.workspace.name} created successfully!`)
        } else {
            this.warn(`Workspace ${createWorkspaceOutput.workspace.name} already exists.`)
        }
    }
}
