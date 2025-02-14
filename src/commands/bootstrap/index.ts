import { Args, Command, Flags } from '@oclif/core'

import { InfrastructureType } from '../../infrastructure/common.js';
import { getInfrastructure } from '../../infrastructure/index.js';

export default class Bootstrap extends Command {
    static override args = {
        infrastructureType: Args.string({
            description: 'infrastructure to bootstrap. Options are local, aws',
            required: true
        })
    }
static override description = 'Install necessary resources for hereya operations in an infrastructure.'
static override examples = [
        '<%= config.bin %> <%= command.id %> aws',
        '<%= config.bin %> <%= command.id %> local'
    ]
static override flags = {
        force: Flags.boolean({ char: 'f', description: 'redeploy hereya resources if already deployed' }),
    }

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(Bootstrap)

        const infrastructure$ = getInfrastructure({ type: args.infrastructureType as InfrastructureType })
        if (!infrastructure$.supported) {
            this.warn(infrastructure$.reason)
            return
        }

        const { infrastructure } = infrastructure$

        await infrastructure.bootstrap({ force: flags.force })
    }
}
