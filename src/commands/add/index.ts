import { Args, Command, Flags } from '@oclif/core'

import { getBackend } from '../../backend/index.js';
import { provisionPackage } from '../../infrastructure/index.js';
import { getConfigManager } from '../../lib/config/index.js';
import { getEnvManager } from '../../lib/env/index.js';
import { logEnv } from '../../lib/env-utils.js';
import { arrayOfStringToObject } from '../../lib/object-utils.js';
import { getParameterManager } from '../../lib/parameter/index.js';


export default class Add extends Command {
    static override args = {
        package: Args.string({
            description: 'The package to add. Packages are gitHub repositories. Use the format owner/repository',
            required: true
        }),
    }

    static override description = 'Add a package to the project.'

    static override examples = [
        '<%= config.bin %> <%= command.id %> cloudy/docker_postgres',
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
        const { args, flags } = await this.parse(Add)

        const projectRootDir = flags.chdir || process.env.HEREYA_PROJECT_ROOT_DIR

        const configManager = getConfigManager()

        const loadConfigOutput = await configManager.loadConfig({ projectRootDir })
        if (!loadConfigOutput.found) {
            this.warn(`Project not initialized. Run 'hereya init' first.`)
            return
        }

        const { config } = loadConfigOutput

        const backend = await getBackend()
        const getWorkspaceEnvOutput = await backend.getWorkspaceEnv({
            project: config.project,
            workspace: config.workspace,
        })
        if (!getWorkspaceEnvOutput.success) {
            this.error(getWorkspaceEnvOutput.reason)
        }

        const { env: workspaceEnv } = getWorkspaceEnvOutput

        const userSpecifiedParameters = arrayOfStringToObject(flags.parameter)
        const parameterManager = getParameterManager()
        const { parameters } = await parameterManager.getPackageParameters({
            package: args.package,
            projectRootDir,
            userSpecifiedParameters,
            workspace: config.workspace,
        })

        const provisionOutput = await provisionPackage({
            env: workspaceEnv,
            package: args.package,
            parameters,
            project: config.project,
            workspace: config.workspace,
        })

        if (!provisionOutput.success) {
            this.error(provisionOutput.reason)
        }

        const { env, metadata } = provisionOutput
        this.log(`Package ${args.package} added successfully`)
        this.log(`Saving exported environment variables`)

        const envManager = getEnvManager()
        await envManager.addProjectEnv({
            env,
            infra: metadata.infra,
            projectRootDir,
            workspace: config.workspace,
        })
        await configManager.addPackage({
            package: args.package,
            projectRootDir,
        })


        const { config: newConfig } = await configManager.loadConfig({ projectRootDir })
        await backend.saveState(newConfig)
        const { filePath, saved } = await parameterManager.savePackageParameters({
            package: args.package,
            parameters,
            projectRootDir,
            workspace: config.workspace,
        })

        if (saved) {
            this.log(`Saved the following parameters for the package in ${filePath}:`)
            logEnv(parameters, this.log.bind(this))
        }
    }
}
