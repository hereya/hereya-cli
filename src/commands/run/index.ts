import { Args, Command, Flags } from '@oclif/core'
import { execa } from '@esm2cjs/execa'
import { getProjectEnv } from '../../lib/env.js';
import { getConfigManager } from '../../lib/config/index.js';

export default class Run extends Command {
    static args = {
        cmd: Args.string({ description: 'command to run', required: true }),
    }

    static strict = false

    static override description = 'run a command with hereya env vars'

    static override examples = [
        '<%= config.bin %> <%= command.id %> -- npm run dev',
        '<%= config.bin %> <%= command.id %> -w uat -- node index.js',
    ]

    static flags = {
        workspace: Flags.string({
            char: 'w',
            description: 'name of the workspace to run the command in',
            required: false,
        }),
        chdir: Flags.string({
            description: 'directory to run command in',
            required: false,
        }),
    }

    public async run(): Promise<void> {
        const { args, argv, flags } = await this.parse(Run)

        const configManager = getConfigManager()
        const loadConfigOutput = await configManager.loadConfig({ projectRootDir: flags.chdir })
        if (!loadConfigOutput.found) {
            this.warn(`Project not initialized. Run 'hereya init' first.`)
            return
        }
        const { config } = loadConfigOutput
        let workspace = flags.workspace

        if (!workspace) {
            workspace = config.workspace
        }

        if (!workspace) {
            return this.error('you must specify a workspace to run the command in')
        }

        const { env } = await getProjectEnv({
            workspace,
            projectRootDir: flags.chdir,
        })

        const { cmd } = args
        const cmdArgs = argv.slice(1) as string[]

        this.log(`Running command "${cmd} ${cmdArgs.join(' ')}" ...`)
        const res = await execa(cmd, cmdArgs, {
            env: { ...process.env, ...env },
            stdio: 'inherit',
            cwd: flags.chdir,
        })
        if (res.exitCode !== 0) {
            this.error(res.stderr)
        }
    }
}
