import { Args, Command, Flags } from '@oclif/core'
import * as cfg from '../../lib/config.js';
import { loadConfig } from '../../lib/config.js';
import { resolvePackage } from '../../lib/package.js';
import { getInfrastructure } from '../../infrastructure/index.js';
import { logEnv, removeEnv } from '../../lib/env.js';
import { getBackend } from '../../backend/index.js';

export default class Remove extends Command {
    static override args = {
        package: Args.string({
            description: 'The package to remove. Packages are gitHub repositories. Use the format owner/repository',
            required: true
        }),
    }

    static override description = 'remove a package from the project'

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
        const { args, flags } = await this.parse(Remove)

        const loadConfigOutput = await cfg.loadConfig({ projectRootDir: flags.chdir })
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
        const destroyOutput = await infrastructure.destroy({
            project: config.project,
            workspace: config.workspace,
            workspaceEnv: {}, // todo: get workspace env vars from backend
            pkgName: args.package,
            canonicalName,
            pkgUrl: packageUri,
            iacType: metadata.iac,
        })
        if (!destroyOutput.success) {
            this.error(destroyOutput.reason)
        }
        const { env } = destroyOutput

        this.log(`Infrastructure resources for ${args.package} have been destroyed`)

        this.log('removing the following env vars from project')
        logEnv(env, this.log.bind(this))
        await removeEnv({
            env,
            infra: metadata.infra,
            projectRootDir: flags.chdir,
            workspace: config.workspace
        })
        await cfg.removePackage({
            projectRootDir: flags.chdir,
            package: args.package
        })

        const backend = await getBackend()
        const { config: newConfig } = await loadConfig({ projectRootDir: flags.chdir })
        await backend.saveState(newConfig)
    }
}
