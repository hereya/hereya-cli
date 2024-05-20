import { Args, Command, Flags } from '@oclif/core'

import { getBackend } from '../../../backend/index.js';
import { destroyPackage } from '../../../infrastructure/index.js';
import { arrayOfStringToObject } from '../../../lib/object-utils.js';
import { load } from '../../../lib/yaml-utils.js';

export default class WorkspaceUninstall extends Command {
    static override args = {
        package: Args.string({
            description: 'The package to remove. Packages are gitHub repositories. Use the format owner/repository',
            required: true
        }),
    }

    static override description = 'removes a package from a workspace'

    static override examples = [
        '<%= config.bin %> <%= command.id %> hereya/aws-cognito',
    ]

    static flags = {
        parameter: Flags.string({
            char: 'p',
            default: [],
            description: 'parameter for the package, in the form of \'key=value\'. Can be specified multiple times.',
            multiple: true,
        }),
        'parameter-file': Flags.string({
            char: 'f',
            description: 'path to a file containing parameters for the package',
        }),
        workspace: Flags.string({
            char: 'w',
            description: 'name of the workspace to remove the package from',
            required: true,
        }),
    }

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(WorkspaceUninstall)

        const backend = await getBackend()
        const loadWorkspaceOutput = await backend.getWorkspace(flags.workspace)
        if (!loadWorkspaceOutput.found) {
            this.error(`Workspace ${flags.workspace} not found`)
        }

        if (loadWorkspaceOutput.hasError) {
            this.error(`Error loading workspace ${flags.workspace}: ${loadWorkspaceOutput.error}`)
        }

        const { workspace } = loadWorkspaceOutput
        if (!(args.package in (workspace.packages ?? {}))) {
            this.log(`Package ${args.package} not found in workspace ${flags.workspace}`)
            return
        }

        const parametersInCmdline = arrayOfStringToObject(flags.parameter)
        let parametersFromFile = {}
        if (flags['parameter-file']) {
            const { data, found } = await load(flags['parameter-file'])
            if (!found) {
                this.error(`Parameter file ${flags['parameter-file']} not found`)
            }

            parametersFromFile = data
        }

        const parameters = {
            ...workspace.packages?.[args.package].parameters,
            ...parametersFromFile,
            ...parametersInCmdline
        }

        const destroyOutput = await destroyPackage({
            package: args.package,
            parameters,
            workspace: flags.workspace,
        })
        if (!destroyOutput.success) {
            this.error(destroyOutput.reason)
        }

        const { env, metadata } = destroyOutput
        this.log(`Package ${args.package} removed successfully`)
        this.log(`removing exported environment variables from workspace ${flags.workspace}...`)

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
