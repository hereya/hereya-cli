import { Args, Command, Flags } from '@oclif/core'

import { getBackend } from '../../../backend/index.js';
import { provisionPackage } from '../../../infrastructure/index.js';
import { logEnv } from '../../../lib/env-utils.js';
import { arrayOfStringToObject } from '../../../lib/object-utils.js';
import { load } from '../../../lib/yaml-utils.js';

export default class WorkspaceAdd extends Command {
    static override args = {
        package: Args.string({
            description: 'The package to add. Packages are gitHub repositories. Use the format owner/repository',
            required: true
        }),
    }

    static override description = 'adds a package to the workspace'

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
            description: 'name of the workspace to add the package to',
            required: true,
        }),
    }


    public async run(): Promise<void> {
        const { args, flags } = await this.parse(WorkspaceAdd)

        const backend = await getBackend()
        const loadWorkspaceOutput = await backend.getWorkspace(flags.workspace)
        if (!loadWorkspaceOutput.found || loadWorkspaceOutput.hasError) {
            this.error(`Workspace ${flags.workspace} not found`)
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

        const parameters = { ...parametersFromFile, ...parametersInCmdline }

        const provisionOutput = await provisionPackage({
            package: args.package,
            parameters,
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

        const output = await backend.addPackageToWorkspace({
            env,
            infra: metadata.infra,
            package: args.package,
            parameters,
            workspace: flags.workspace,
        })
        if (!output.success) {
            this.error(output.reason)
        }

        this.log(`Package ${args.package} added to workspace ${flags.workspace}`)
    }
}
