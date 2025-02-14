import { Args, Command, Flags } from '@oclif/core'

import { getConfigManager } from '../../lib/config/index.js';
import { logEnv } from '../../lib/env-utils.js';
import { getEnvManager } from '../../lib/env/index.js';

export default class Env extends Command {
    static override args = {
        name: Args.string({ description: 'name of the env to display', required: false }),
    }
static override description = 'Print project environment variables.'
static override examples = [
        '<%= config.bin %> <%= command.id %>',
        '<%= config.bin %> <%= command.id %> myEnv',
        '<%= config.bin %> <%= command.id %> -w dev',
        '<%= config.bin %> <%= command.id %> -w dev -l',
    ]
static flags = {
        chdir: Flags.string({
            description: 'project root directory',
            required: false,
        }),
        list: Flags.boolean({
            char: 'l',
            description: 'list only the env vars without values',
            required: false,
        }),
        workspace: Flags.string({
            char: 'w',
            description: 'name of the workspace to print the env vars for',
            required: false,
        }),
    }


    public async run(): Promise<void> {
        const { args, flags } = await this.parse(Env)

        const projectRootDir = flags.chdir || process.env.HEREYA_PROJECT_ROOT_DIR
        const configManager = getConfigManager()
        const loadConfigOutput = await configManager.loadConfig({ projectRootDir })
        if (!loadConfigOutput.found) {
            this.warn(`Project not initialized. Run 'hereya init' first.`)
            return
        }

        const { config } = loadConfigOutput
        let { list, workspace } = flags

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

        if (args.name) {
            if (env[args.name] === undefined) {
                this.error(`Env var ${args.name} not found`)
            }

            this.log(env[args.name])
            return
        }

        if (list) {
            this.log(Object.keys(env).join('\n'))
            return
        }

        logEnv(env)
    }
}
