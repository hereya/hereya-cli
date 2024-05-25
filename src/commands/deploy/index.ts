import { Command, Flags } from '@oclif/core'

export default class Deploy extends Command {
    static override description = 'Deploy a hereya project using the project deployment package'

    static override examples = [
        '<%= config.bin %> <%= command.id %>',
    ]

    static override flags = {
        chdir: Flags.string({
            description: 'directory to run command in',
            required: false,
        }),
        parameter: Flags.string({
            char: 'p',
            default: [],
            description: 'parameter for the package, in the form of \'key=value\'. Can be specified multiple times.',
            multiple: true,
        }),
    }

    public async run(): Promise<void> {
        await this.parse(Deploy)

    }
}
