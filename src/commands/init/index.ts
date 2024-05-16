import { Args, Command, Flags } from '@oclif/core'

import { getBackend } from '../../backend/index.js';
import { Config, loadConfig, saveConfig } from '../../lib/config.js';


export default class Init extends Command {
    static override args = {
        project: Args.string({ description: 'project name', required: true }),
    }

    static override description = 'initialize hereya in a project directory'

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
        const config$ = await loadConfig({ projectRootDir: flags.chdir })
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

        await saveConfig({ config: content, projectRootDir: flags.chdir })

        this.log(`Initialized project ${initProjectOutput.project.name}.`)
        this.log(`Current workspace set to ${initProjectOutput.workspace.name}.`)
    }
}
