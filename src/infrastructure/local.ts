import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'

import { getIac } from '../iac/index.js'
import { downloadPackage } from '../lib/package/index.js'
import {
  DeployInput,
  DeployOutput,
  Infrastructure,
  ProvisionInput,
  ProvisionOutput,
  SaveEnvInput,
  SaveEnvOutput,
  StoreEnvInput,
  StoreEnvOutput,
  UndeployInput,
  UndeployOutput,
  UnstoreEnvInput,
  UnstoreEnvOutput,
} from './common.js'

export class LocalInfrastructure implements Infrastructure {
  async bootstrap() {
    console.log('Bootstrapping local infrastructure')
  }

  async deploy(input: DeployInput): Promise<DeployOutput> {
    input.parameters = {
      ...input.parameters,
      hereyaProjectEnv: JSON.stringify(input.projectEnv ?? {}),
      hereyaProjectRootDir: input.projectRootDir,
    }
    return this.provision(input)
  }

  async destroy(input: ProvisionInput): Promise<ProvisionOutput> {
    // noinspection DuplicatedCode
    const destPath = path.join(os.homedir(), '.hereya', input.id, input.canonicalName)
    const downloadPath = await downloadPackage(input.pkgUrl, destPath)
    const iac$ = getIac({type: input.iacType})
    if (!iac$.supported) {
      return {reason: iac$.reason, success: false}
    }

    const {iac} = iac$
    const output = await iac.destroy({
      env: input.env ?? {},
      id: input.id,
      parameters: input.parameters,
      pkgPath: downloadPath,
    })
    if (!output.success) {
      return {reason: output.reason, success: false}
    }

    // Remove downloaded package
    await fs.rm(downloadPath, {recursive: true})

    return {env: output.env, success: true}
  }

  async provision(input: ProvisionInput): Promise<ProvisionOutput> {
    // noinspection DuplicatedCode
    const destPath = path.join(os.homedir(), '.hereya', input.id, input.canonicalName)
    const downloadPath = await downloadPackage(input.pkgUrl, destPath)
    const iac$ = getIac({type: input.iacType})
    if (!iac$.supported) {
      return {reason: iac$.reason, success: false}
    }

    const {iac} = iac$
    const output = await iac.apply({
      env: input.env ?? {},
      id: input.id,
      parameters: input.parameters,
      pkgPath: downloadPath,
    })
    if (!output.success) {
      return {reason: output.reason, success: false}
    }

    return {env: output.env, success: true}
  }

  async resolveEnv(input: {value: string}) {
    return {value: input.value}
  }

  async saveEnv(input: SaveEnvInput): Promise<SaveEnvOutput> {
    console.log(`Saving env to ${input.id}`)
    return {success: true}
  }

  async storeEnv(input: StoreEnvInput): Promise<StoreEnvOutput> {
    return {success: true, value: input.value}
  }

  async unbootstrap() {
    console.log('Unbootstrapping local infrastructure')
  }

  async undeploy(input: UndeployInput): Promise<UndeployOutput> {
    input.parameters = {
      ...input.parameters,
      hereyaProjectEnv: JSON.stringify(input.projectEnv ?? {}),
      hereyaProjectRootDir: input.projectRootDir,
    }
    return this.destroy(input)
  }

  async unstoreEnv(_: UnstoreEnvInput): Promise<UnstoreEnvOutput> {
    return {success: true}
  }
}
