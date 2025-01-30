import {Args, Command, Flags} from '@oclif/core'
import path from 'node:path'

import {getConfigManager} from '../../../lib/config/index.js'
import { getAnyPath } from '../../../lib/filesystem.js'
import { load , save } from '../../../lib/yaml-utils.js'

export default class EnvSet extends Command {
  static override args = {
    name: Args.string({description: 'name of the environment variable to set'}),
  }

  static override description = 'Set an user-defined environment variable for the project'

  static override examples = ['<%= config.bin %> <%= command.id %> FOO bar']

  static flags = {
    chdir: Flags.string({
      description: 'project root directory',
      required: false,
    }),
    value: Flags.string({
      char: 'v',
      description: 'value of the environment variable',
      required: true,
    }),
    workspace: Flags.string({
      char: 'w',
      description: 'name of the workspace to print the env vars for',
      required: false,
    }),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(EnvSet)
    if (!args.name) {
      this.error('Missing required argument name')
    }

    const projectRootDir = flags.chdir || process.env.HEREYA_PROJECT_ROOT_DIR
    const configManager = getConfigManager()
    const loadConfigOutput = await configManager.loadConfig({projectRootDir})
    if (!loadConfigOutput.found) {
      this.warn(`Project not initialized. Run 'hereya init' first.`)
      return
    }


    const rootDir = projectRootDir ?? process.cwd()

    const candidates = flags.workspace ? [
      path.join(rootDir, 'hereyastaticenv', `env.${flags.workspace}.yaml`),
      path.join(rootDir, 'hereyastaticenv', `env.${flags.workspace}.yml`),
    ] : [
      path.join(rootDir, 'hereyastaticenv', `env.yaml`),
      path.join(rootDir, 'hereyastaticenv', `env.yml`),
    ]

    const envFile = await getAnyPath(...candidates)
    const {data: env,} = await load<{ [k: string]: string }>(envFile)
    env[args.name] = flags.value
    await save(env, envFile)

    this.log(`Environment variable ${args.name} set to ${flags.value} in ${envFile}`)
  }
}

