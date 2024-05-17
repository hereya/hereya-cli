import { execa } from '@esm2cjs/execa'
import { Args, Command, Flags } from '@oclif/core'

import { getConfigManager } from '../../lib/config/index.js';
import { getEnvManager } from '../../lib/env/index.js';

export default class Run extends Command {
    static args = {
        cmd: Args.string({ description: 'command to run', required: true }),
    }

    static override description = 'run a command with hereya env vars'

    static override examples = [
        '<%= config.bin %> <%= command.id %> -- npm run dev',
        '<%= config.bin %> <%= command.id %> -w uat -- node index.js',
    ]

    static flags = {
        chdir: Flags.string({
            description: 'directory to run command in',
            required: false,
        }),
        workspace: Flags.string({
            char: 'w',
            description: 'name of the workspace to run the command in',
            required: false,
        }),
    }

    static strict = false

    public async run(): Promise<void> {
        const { args, argv, flags } = await this.parse(Run)

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
            this.error('you must specify a workspace to run the command in')
        }

        const envManager = getEnvManager()
        const { env } = await envManager.getProjectEnv({
            projectRootDir,
            workspace,
        })

        const { cmd } = args
        const cmdArgs = argv.slice(1) as string[]

        this.log(`Running command "${cmd} ${cmdArgs.join(' ')}" ...`)
        const res = await execa(cmd, cmdArgs, {
            cwd: projectRootDir,
            env: { ...process.env, ...env },
            stdio: 'inherit',
        })
        if (res.exitCode !== 0) {
            this.error(res.stderr)
        }
    }
}
