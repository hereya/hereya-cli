import { Args, Command, Flags } from '@oclif/core'

import { getBackend } from '../../../backend/index.js';
import { provisionPackage } from '../../../infrastructure/index.js';
import { logEnv } from '../../../lib/env-utils.js';

export default class WorkspaceAdd extends Command {
    static override args = {
        package: Args.string({
            description: 'The package to add. Packages are gitHub repositories. Use the format owner/repository',
            required: true
        }),
    }

    static override description = 'add a package to the workspace'

    static override examples = [
        '<%= config.bin %> <%= command.id %> hereya/aws-cognito',
    ]

    static flags = {
        workspace: Flags.string({
            char: 'w',
            description: 'name of the workspace to add the package to',
            required: true,
        }),
    }


    public async run(): Promise<void> {
        const { args, flags } = await this.parse(WorkspaceAdd)

        const provisionOutput = await provisionPackage({
            package: args.package,
            workspace: flags.workspace,
        })
        if (!provisionOutput.success) {
            this.error(provisionOutput.reason)
        }

        const { env, metadata } = provisionOutput
        this.log(`Package ${args.package} provisioned successfully`)
        this.log(`Saving exported environment variables to workspace ${flags.workspace}...`)
        // log env vars
        logEnv(env, this.log.bind(this))

        const backend = await getBackend()
        const output = await backend.addPackageToWorkspace({
            env,
            infra: metadata.infra,
            package: args.package,
            workspace: flags.workspace,
        })
        if (!output.success) {
            this.error(output.reason)
        }

        this.log(`Package ${args.package} added to workspace ${flags.workspace}`)
    }
}
