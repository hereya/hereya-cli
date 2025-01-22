import { Command, Flags } from '@oclif/core'
import path from 'node:path'

import { getBackend } from '../../backend/index.js'
import { destroyPackage } from '../../infrastructure/index.js'
import { getConfigManager } from '../../lib/config/index.js'
import { getEnvManager } from '../../lib/env/index.js'
import { getLogger } from '../../lib/log.js'
import { getParameterManager } from '../../lib/parameter/index.js'
import { setDebug } from '../../lib/shell.js'
import Down from '../down/index.js'

export default class Undeploy extends Command {
  static override description = 'Undeploy a hereya project by removing all resources.'

  static override examples = ['<%= config.bin %> <%= command.id %>']

  static override flags = {
    chdir: Flags.string({
      description: 'directory to run command in',
      required: false,
    }),
    debug: Flags.boolean({
      default: false,
      description: 'enable debug mode',
    }),
    workspace: Flags.string({
      char: 'w',
      description: 'name of the workspace to undeploy the packages for',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(Undeploy)

    setDebug(flags.debug)
    const logger = getLogger()

    const projectRootDir = path.resolve(flags.chdir || process.env.HEREYA_PROJECT_ROOT_DIR || process.cwd())
    const configManager = getConfigManager()
    const loadConfigOutput = await configManager.loadConfig({projectRootDir})
    if (!loadConfigOutput.found) {
      this.warn(`Project not initialized. Run 'hereya init' first.`)
      return
    }

    const {config} = loadConfigOutput
    const deployPackages = Object.keys(config.deploy ?? {})
    const workspace = flags.workspace || config.workspace
    const backend = await getBackend()
    const getWorkspaceEnvOutput = await backend.getWorkspaceEnv({
      project: config.project,
      workspace,
    })
    if (!getWorkspaceEnvOutput.success) {
      this.error(getWorkspaceEnvOutput.reason)
    }

    const {env: workspaceEnv} = getWorkspaceEnvOutput
    const parameterManager = getParameterManager()
    const envManager = getEnvManager()
    const {env: projectEnv} = await envManager.getProjectEnv({
      markSecret: true,
      projectRootDir,
      workspace,
    })

    logger.log(`Destroying ${deployPackages.length} deployment packages`)

    await Promise.all(
      deployPackages.map(async (packageName) => {
        const {parameters} = await parameterManager.getPackageParameters({
          package: packageName,
          projectRootDir,
          workspace,
        })
        const destroyOutput = await destroyPackage({
          env: workspaceEnv,
          isDeploying: true,
          package: packageName,
          parameters,
          project: config.project,
          projectEnv,
          projectRootDir,
          workspace,
        })
        if (!destroyOutput.success) {
          this.error(destroyOutput.reason)
        }

        this.log(`Package ${packageName} un-deployed successfully`)
      }),
    )

    logger.done(`Destroyed ${deployPackages.length} deployment packages`)

    await Down.run(['--chdir', projectRootDir, '--workspace', workspace, '--deploy'])
  }
}
