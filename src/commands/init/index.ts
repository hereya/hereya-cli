import { Args, Command, Flags } from '@oclif/core'
import * as path from 'node:path';

import * as yaml from '../../lib/yaml-utils.js';



export default class Init extends Command {
    static override args = {
        project: Args.string({ description: 'project name', required: true }),
    }

    static override description = 'initialize hereya in a project directory'

    static override examples = [
        '<%= config.bin %> <%= command.id %> myProject',
        '<%= config.bin %> <%= command.id %> myProject -w=defaultWorkspace',
    ]

    static override flags = {
        chdir: Flags.string({
            default: process.cwd(),
            description: 'directory to run command in',
            required: false,
        }),
        workspace: Flags.string({
            char: 'w',
            description: 'workspace to set as default',
            required: false,
        }),

    }

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(Init)
        const { found } = await yaml.load(path.join(flags.chdir, "hereya.yaml"))
        if (found) {
            this.warn(`Project already initialized.`)
            return
        }

        const { project } = args
        const content = {
            project,
            workspace: flags.workspace,
        }

        await yaml.save( content, path.join(flags.chdir, "hereya.yaml"))

        this.log(`Initialized ${project}.`)
        if (flags.workspace) {
            this.log(`Default workspace set to ${flags.workspace}.`)
        }
    }
}
