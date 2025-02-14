import { Args, Command, Flags } from '@oclif/core'

import { InfrastructureType } from '../../infrastructure/common.js';
import { getInfrastructure } from '../../infrastructure/index.js';

export default class Unbootstrap extends Command {
    static override args = {
        infrastructureType: Args.string({
            description: 'infrastructure to unbootstrap. Options are local, aws',
            required: true
        })
    }
static override description = 'Uninstall hereya resources deployed with bootstrap command.'
static override examples = [
        '<%= config.bin %> <%= command.id %> aws',
        '<%= config.bin %> <%= command.id %> local',
    ]
static override flags = {
        force: Flags.boolean({ char: 'f', description: 'try to delete hereya resources even if not deployed' }),
    }

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(Unbootstrap)

        const infrastructure$ = getInfrastructure({ type: args.infrastructureType as InfrastructureType })
        if (!infrastructure$.supported) {
            this.warn(infrastructure$.reason)
            return
        }

        const { infrastructure } = infrastructure$

        await infrastructure.unbootstrap({ force: flags.force })
    }
}
