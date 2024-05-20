import { Command, Flags } from '@oclif/core'

import { getBackend } from '../../../backend/index.js';
import { logEnv } from '../../../lib/env-utils.js';

export default class WorkspaceEnv extends Command {
    static override description = 'prints workspace env vars'

    static override examples = [
        '<%= config.bin %> <%= command.id %> -w dev',
    ]

    static override flags = {
        workspace: Flags.string({
            char: 'w',
            description: 'name of the workspace to print env vars for',
            required: true,
        }),
    }

    public async run(): Promise<void> {
        const { flags } = await this.parse(WorkspaceEnv)

        const backend = await getBackend()
        const getWorkspaceEnvOutput = await backend.getWorkspaceEnv({
            workspace: flags.workspace,
        })
        if (!getWorkspaceEnvOutput.success) {
            this.error(getWorkspaceEnvOutput.reason)
        }

        const { env } = getWorkspaceEnvOutput
        logEnv(env)
    }
}
