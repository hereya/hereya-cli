import { Args, Command, Flags } from '@oclif/core'

import { getBackend } from '../../../backend/index.js';
import { destroyPackage } from '../../../infrastructure/index.js';
import { logEnv } from '../../../lib/env-utils.js';

export default class WorkspaceRemove extends Command {
    static override args = {
        package: Args.string({
            description: 'The package to remove. Packages are gitHub repositories. Use the format owner/repository',
            required: true
        }),
    }

    static override description = 'remove a package from a workspace'

    static override examples = [
        '<%= config.bin %> <%= command.id %> hereya/aws-cognito',
    ]

    static flags = {
        workspace: Flags.string({
            char: 'w',
            description: 'name of the workspace to remove the package from',
            required: true,
        }),
    }

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(WorkspaceRemove)

        const backend = await getBackend()
        const loadWorkspaceOutput = await backend.getWorkspace(flags.workspace)
        if (!loadWorkspaceOutput.found || loadWorkspaceOutput.hasError) {
            this.error(`Workspace ${flags.workspace} not found`)
        }

        const { workspace } = loadWorkspaceOutput
        if (!(args.package in (workspace.packages ?? {}))) {
            this.log(`Package ${args.package} not found in workspace ${flags.workspace}`)
            return
        }

        const destroyOutput = await destroyPackage({
            package: args.package,
            workspace: flags.workspace,
        })
        if (!destroyOutput.success) {
            this.error(destroyOutput.reason)
        }

        const { env, metadata } = destroyOutput
        this.log(`Package ${args.package} removed successfully`)
        this.log(`removing exported environment variables from workspace ${flags.workspace}...`)
        // log env vars
        logEnv(env, this.log.bind(this))

        const output = await backend.removePackageFromWorkspace({
            env,
            infra: metadata.infra,
            package: args.package,
            workspace: flags.workspace,
        })
        if (!output.success) {
            this.error(output.reason)
        }

        this.log(`Package ${args.package} removed from workspace ${flags.workspace}`)

    }
}
