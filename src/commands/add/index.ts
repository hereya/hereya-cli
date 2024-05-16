import { Args, Command, Flags } from '@oclif/core'
import * as yaml from 'yaml'
import { addPackage, loadConfig } from '../../lib/config.js';
import { getRepoContent } from '../../lib/github.js';
import { PackageMetadata } from '../../infrastructure/common.js';
import { getInfrastructure } from '../../infrastructure/index.js';
import { addEnv } from '../../lib/env.js';


export default class Add extends Command {
    static override args = {
        package: Args.string({
            description: 'The package to add. Packages are gitHub repositories. Use the format <owner>/<repository>',
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

        const pkgParts = args.package.split('/')
        if (pkgParts.length !== 2) {
            this.warn(`Invalid package format. Use <owner>/<repository>`)
            return
        }

        const [owner, repo] = pkgParts

        this.log(`Adding package ${args.package}...`)
        const pkgUrl = `https://github.com/${args.package}`
        this.log(`Resolved package ${args.package} to ${pkgUrl}`)

        const metadataContentCandidates = (await Promise.all([
            getRepoContent({ owner, repo, path: 'hereyarc.yaml' }),
            getRepoContent({ owner, repo, path: 'hereyarc.yml' }),
        ])).filter(content$ => content$.found)

        if (metadataContentCandidates.length === 0) {
            this.error(`No hereya metadata file found in ${pkgUrl}`)
        }

        const metadataContent$ = metadataContentCandidates[0] as { content: string }
        const metadata = PackageMetadata.parse(yaml.parse(metadataContent$.content))

        const infrastructure$ = await getInfrastructure({ type: metadata.infra })
        if (!infrastructure$.supported) {
            this.error(infrastructure$.reason)
        }

        const { infrastructure } = infrastructure$
        const provisionOutput = await infrastructure.provision({
            project: config.project,
            workspace: config.workspace,
            workspaceEnv: {}, // todo: get workspace env vars from backend
            pkgName: args.package,
            pkgUrl, iacType:
            metadata.iac,
        })
        if (!provisionOutput.success) {
            this.error(provisionOutput.reason)
        }

        const { env } = provisionOutput
        this.log(`Package ${args.package} added successfully`)
        this.log(`Saving exported environment variables`)
        // log env vars
        for (const [key, value] of Object.entries(env)) {
            this.log(`${key}=${value}`)
        }
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
    }
}
