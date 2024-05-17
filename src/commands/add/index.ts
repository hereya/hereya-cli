import { Args, Command, Flags } from '@oclif/core'

import { getBackend } from '../../backend/index.js';
import { getInfrastructure } from '../../infrastructure/index.js';
import { getConfigManager } from '../../lib/config/index.js';
import { getEnvManager } from '../../lib/env/index.js';
import { logEnv } from '../../lib/env-utils.js';
import { resolvePackage } from '../../lib/package/index.js';


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

        const resolvePackageOutput = await resolvePackage({ package: args.package })
        if (!resolvePackageOutput.found) {
            this.error(resolvePackageOutput.reason)
        }

        const { canonicalName, metadata, packageUri } = resolvePackageOutput

        const infrastructure$ = await getInfrastructure({ type: metadata.infra })
        if (!infrastructure$.supported) {
            this.error(infrastructure$.reason)
        }

        const { infrastructure } = infrastructure$
        const envManager = getEnvManager()
        const getWorkspaceEnvOutput = await envManager.getWorkspaceEnv({
            project: config.project,
            workspace: config.workspace,
        })
        if (!getWorkspaceEnvOutput.success) {
            this.error(getWorkspaceEnvOutput.reason)
        }

        const { env: workspaceEnv } = getWorkspaceEnvOutput

        const provisionOutput = await infrastructure.provision({
            canonicalName,
            iacType: metadata.iac,
            pkgName: args.package,
            pkgUrl: packageUri,
            project: config.project,
            workspace: config.workspace,
            workspaceEnv,
        })
        if (!provisionOutput.success) {
            this.error(provisionOutput.reason)
        }

        const { env } = provisionOutput
        this.log(`Package ${args.package} added successfully`)
        this.log(`Saving exported environment variables`)
        // log env vars
        logEnv(env, this.log.bind(this))

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

        const backend = await getBackend()
        const { config: newConfig } = await configManager.loadConfig({ projectRootDir })
        await backend.saveState(newConfig)
    }
}
