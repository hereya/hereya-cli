import { Args, Command, Flags } from '@oclif/core'

import { getBackend } from '../../backend/index.js';
import { Config } from '../../lib/config/common.js';
import { getConfigManager } from '../../lib/config/index.js';


export default class Init extends Command {
    static override args = {
        project: Args.string({ description: 'project name', required: true }),
    }
static override description = 'Initialize hereya in a project directory.'
static override examples = [
        '<%= config.bin %> <%= command.id %> myProject -w=defaultWorkspace',
        '<%= config.bin %> <%= command.id %> myProject -w=defaultWorkspace --chdir=./myProject',
    ]
static override flags = {
        chdir: Flags.string({
            description: 'directory to run command in',
            required: false,
        }),
        workspace: Flags.string({
            char: 'w',
            description: 'workspace to set as default',
            required: true,
        }),

    }

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(Init)

        const projectRootDir = flags.chdir || process.env.HEREYA_PROJECT_ROOT_DIR

        const configManager = getConfigManager()
        const config$ = await configManager.loadConfig({ projectRootDir })
        if (config$.found) {
            this.warn(`Project already initialized.`)
            return
        }

        const backend = await getBackend()
        const initProjectOutput = await backend.init({
            project: args.project,
            workspace: flags.workspace,
        })

        const content: Config = {
            project: initProjectOutput.project.id,
            workspace: initProjectOutput.workspace.name,
        }

        await configManager.saveConfig({ config: content, projectRootDir })

        this.log(`Initialized project ${initProjectOutput.project.name}.`)
        this.log(`Current workspace set to ${initProjectOutput.workspace.name}.`)
    }
}
