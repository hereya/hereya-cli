import path from 'node:path'

import {InfrastructureType} from '../../infrastructure/common.js'
import {resolveEnvValues} from '../env-utils.js'
import {getAnyPath} from '../filesystem.js'
import {load, save} from '../yaml-utils.js'

export class EnvManager {
  async addProjectEnv(input: AddEnvInput): Promise<void> {
    const envPath = await this.getEnvPath(input)
    const {data: existingEnv} = await load(envPath)
    const newEnv = Object.fromEntries(Object.entries(input.env).map(([key, value]) => [key, `${input.infra}:${value}`]))
    const finalEnv = {...existingEnv, ...newEnv}
    await save(finalEnv, envPath)
  }

  async getProjectEnv(input: GetProjectEnvInput): Promise<GetProjectEnvOutput> {
    const envPath = await this.getEnvPath(input)
    const {data: env, found} = await load<{[k: string]: string}>(envPath)
    let resolvedEnv: {[key: string]: string} = {}

    if (found) {
      resolvedEnv = await resolveEnvValues(env, {markSecret: input.markSecret})
    }

    const userEnvs = await this.getUserEnvPaths(input).then((paths) => Promise.all(paths.map((path) => load(path))))

    let userMergedEnv: {[key: string]: string} = {}
    for (const {data} of userEnvs) {
      userMergedEnv = {...userMergedEnv, ...data}
    }

    const finalEnv = {...resolvedEnv, ...userMergedEnv}
    return {env: finalEnv}
  }

  async removeProjectEnv(input: RemoveEnvInput): Promise<void> {
    const envPath = await this.getEnvPath(input)
    const {data: existingEnv, found} = await load(envPath)
    if (!found) {
      return
    }

    const envKeysToRemove = Object.keys(input.env)

    const finalEnv = Object.fromEntries(Object.entries(existingEnv).filter(([key]) => !envKeysToRemove.includes(key)))
    await save(finalEnv, envPath)
  }

  private async getEnvPath(input: GetProjectEnvInput): Promise<string> {
    return getAnyPath(
      path.join(input.projectRootDir ?? process.cwd(), '.hereya', `env.${input.workspace}.yaml`),
      path.join(input.projectRootDir ?? process.cwd(), '.hereya', `env.${input.workspace}.yml`),
    )
  }

  private async getUserEnvPaths(input: GetProjectEnvInput): Promise<string[]> {
    const paths = await Promise.all([
      getAnyPath(
        path.join(input.projectRootDir ?? process.cwd(), 'hereyastaticenv', `env.yaml`),
        path.join(input.projectRootDir ?? process.cwd(), 'hereyastaticenv', `env.yml`),
      ),
      getAnyPath(
        path.join(input.projectRootDir ?? process.cwd(), 'hereyastaticenv', `env.${input.workspace}.yaml`),
        path.join(input.projectRootDir ?? process.cwd(), 'hereyastaticenv', `env.${input.workspace}.yml`),
      ),
    ])
    return paths
  }
}

export const envManager = new EnvManager()

export function getEnvManager() {
  return envManager
}

export type AddEnvInput = {
  env: {[key: string]: string}
  infra: InfrastructureType
  projectRootDir?: string
  workspace: string
}

export type RemoveEnvInput = AddEnvInput

export type GetProjectEnvInput = {
  markSecret?: boolean
  projectRootDir?: string
  workspace: string
}

export type GetProjectEnvOutput = {
  env: {[key: string]: string}
}
