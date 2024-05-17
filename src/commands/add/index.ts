import { Args, Command, Flags } from '@oclif/core'

import { getBackend } from '../../backend/index.js';
import { provisionPackage } from '../../infrastructure/index.js';
import { getConfigManager } from '../../lib/config/index.js';
import { getEnvManager } from '../../lib/env/index.js';
import { logEnv } from '../../lib/env-utils.js';


export default class Add extends Command {
    static override args = {
        package: Args.string({
            description: 'The package to add. Packages are gitHub repositories. Use the format owner/repository',
            required: true
        }),
    }

    static override description = 'add a package to the project'

    static override examples = [
        '<%= config.bin %> <%= command.id %> cloudy/docker_postgres',
    ]

    static override flags = {
        chdir: Flags.string({
            description: 'directory to run command in',
            required: false,
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

        const provisionOutput = await provisionPackage({
            package: args.package,
            project: config.project,
            workspace: config.workspace,
            workspaceEnv,
        })

        if (!provisionOutput.success) {
            this.error(provisionOutput.reason)
        }

        const { env, metadata } = provisionOutput
        this.log(`Package ${args.package} added successfully`)
        this.log(`Saving exported environment variables`)
        // log env vars
        logEnv(env, this.log.bind(this))

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
    }
}
