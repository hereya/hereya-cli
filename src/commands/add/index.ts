import { Args, Command, Flags } from '@oclif/core'
import { addPackage, loadConfig } from '../../lib/config.js';
import { getInfrastructure } from '../../infrastructure/index.js';
import { addEnv, getWorkspaceEnv, logEnv } from '../../lib/env.js';
import { getBackend } from '../../backend/index.js';
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

        const loadConfigOutput = await loadConfig({ projectRootDir: flags.chdir })
        if (!loadConfigOutput.found) {
            this.warn(`Project not initialized. Run 'hereya init' first.`)
            return
        }
        const { config } = loadConfigOutput

        const resolvePackageOutput = await resolvePackage({ package: args.package })
        if (!resolvePackageOutput.found) {
            this.error(resolvePackageOutput.reason)
        }
        const { packageUri, metadata, canonicalName } = resolvePackageOutput

        const infrastructure$ = await getInfrastructure({ type: metadata.infra })
        if (!infrastructure$.supported) {
            this.error(infrastructure$.reason)
        }
        const { infrastructure } = infrastructure$

        const getWorkspaceEnvOutput = await getWorkspaceEnv({
            workspace: config.workspace,
            project: config.project,
        })
        if (!getWorkspaceEnvOutput.success) {
            this.error(getWorkspaceEnvOutput.reason)
        }
        const { env: workspaceEnv } = getWorkspaceEnvOutput

        const provisionOutput = await infrastructure.provision({
            project: config.project,
            workspace: config.workspace,
            workspaceEnv,
            pkgName: args.package,
            canonicalName,
            pkgUrl: packageUri,
            iacType: metadata.iac,
        })
        if (!provisionOutput.success) {
            this.error(provisionOutput.reason)
        }

        const { env } = provisionOutput
        this.log(`Package ${args.package} added successfully`)
        this.log(`Saving exported environment variables`)
        // log env vars
        logEnv(env, this.log.bind(this))

        await addEnv({
            env,
            infra: metadata.infra,
            projectRootDir: flags.chdir,
            workspace: config.workspace,
        })
        await addPackage({
            package: args.package,
            projectRootDir: flags.chdir,
        })

        const backend = await getBackend()
        const { config: newConfig } = await loadConfig({ projectRootDir: flags.chdir })
        await backend.saveState(newConfig)
    }
}
