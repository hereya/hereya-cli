import { Args, Command, Flags } from '@oclif/core'

import { getBackend } from '../../backend/index.js'
import { destroyPackage } from '../../infrastructure/index.js'
import { getConfigManager } from '../../lib/config/index.js'
import { getEnvManager } from '../../lib/env/index.js'
import { getLogger } from '../../lib/log.js'
import { getParameterManager } from '../../lib/parameter/index.js'
import { setDebug } from '../../lib/shell.js'

export default class Remove extends Command {
  static override args = {
    package: Args.string({
      description: 'The package to remove. Packages are gitHub repositories. Use the format owner/repository',
      required: true,
    }),
  }

  static override description = 'Remove a package from the project.'

  static override examples = ['<%= config.bin %> <%= command.id %> cloudy/docker_postgres']

  static override flags = {
    chdir: Flags.string({
      description: 'directory to run command in',
      required: false,
    }),
    debug: Flags.boolean({
      default: false,
      description: 'enable debug mode',
    }),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Remove)

    setDebug(flags.debug)

    const logger = getLogger()

    const projectRootDir = flags.chdir || process.env.HEREYA_PROJECT_ROOT_DIR

    const configManager = getConfigManager()
    const loadConfigOutput = await configManager.loadConfig({projectRootDir})
    if (!loadConfigOutput.found) {
      this.warn(`Project not initialized. Run 'hereya init' first.`)
      return
    }

    const {config} = loadConfigOutput
    if (!(args.package in (config.packages ?? {})) && !(args.package in (config.deploy ?? {}))) {
      this.warn(`Package ${args.package} not found in project.`)
      return
    }

    const backend = await getBackend()
    const getWorkspaceEnvOutput = await backend.getWorkspaceEnv({
      project: config.project,
      workspace: config.workspace,
    })
    if (!getWorkspaceEnvOutput.success) {
      this.error(getWorkspaceEnvOutput.reason)
    }

    const {env: workspaceEnv} = getWorkspaceEnvOutput
    const parameterManager = getParameterManager()
    const {parameters} = await parameterManager.getPackageParameters({
      package: args.package,
      projectRootDir,
      workspace: config.workspace,
    })

    logger.log(`Destroying package ${args.package}`)
    const destroyOutput = await destroyPackage({
      env: workspaceEnv,
      package: args.package,
      parameters,
      project: config.project,
      skipDeploy: true,
      workspace: config.workspace,
    })

    if (!destroyOutput.success) {
      this.error(destroyOutput.reason)
    }

    const {env, metadata} = destroyOutput

    if (!metadata.deploy) {
      logger.done(`Destroyed infrastructure resources for ${args.package}`)
    }

    logger.log('removing package env vars from project')

    const envManager = getEnvManager()
    await envManager.removeProjectEnv({
      env,
      infra: metadata.infra,
      projectRootDir,
      workspace: config.workspace,
    })
    logger.done('removed package env vars from project')

    logger.log('removing package from hereya manifest')
    await configManager.removePackage({
      metadata,
      package: args.package,
      projectRootDir,
    })
    logger.done('removed package from hereya manifest')
    const {config: newConfig} = await configManager.loadConfig({projectRootDir})
    await backend.saveState(newConfig)
  }
}
