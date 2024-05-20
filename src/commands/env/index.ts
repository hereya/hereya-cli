import { Command, Flags } from '@oclif/core'

import { getConfigManager } from '../../lib/config/index.js';
import { getEnvManager } from '../../lib/env/index.js';
import { logEnv } from '../../lib/env-utils.js';

export default class Env extends Command {
    static override description = 'prints project environment variables'

    static override examples = [
        '<%= config.bin %> <%= command.id %>',
        '<%= config.bin %> <%= command.id %> -w dev',
    ]

    static flags = {
        chdir: Flags.string({
            description: 'project root directory',
            required: false,
        }),
        workspace: Flags.string({
            char: 'w',
            description: 'name of the workspace to print the env vars for',
            required: false,
        }),
    }


    public async run(): Promise<void> {
        const { flags } = await this.parse(Env)

        const projectRootDir = flags.chdir || process.env.HEREYA_PROJECT_ROOT_DIR
        const configManager = getConfigManager()
        const loadConfigOutput = await configManager.loadConfig({ projectRootDir })
        if (!loadConfigOutput.found) {
            this.warn(`Project not initialized. Run 'hereya init' first.`)
            return
        }

        const { config } = loadConfigOutput
        let { workspace } = flags

        if (!workspace) {
            workspace = config.workspace
        }

        if (!workspace) {
            this.error('you must specify a workspace to print the env vars for')
        }

        const envManager = getEnvManager()
        const { env } = await envManager.getProjectEnv({
            projectRootDir,
            workspace,
        })
        logEnv(env)
    }
}
