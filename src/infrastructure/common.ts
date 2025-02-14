import {IacType} from '../iac/common.js'

export enum InfrastructureType {
  aws = 'aws',
  azure = 'azure',
  gcp = 'gcp',
  local = 'local',
}

export interface Infrastructure {
  bootstrap(input: BootstrapInput): Promise<void>
  deploy(input: DeployInput): Promise<DeployOutput>
  destroy(input: DestroyInput): Promise<DestroyOutput>
  provision(input: ProvisionInput): Promise<ProvisionOutput>
  resolveEnv(input: ResolveEnvInput): Promise<ResolveEnvOutput>
  saveEnv(input: SaveEnvInput): Promise<SaveEnvOutput>
  storeEnv(input: StoreEnvInput): Promise<StoreEnvOutput>
  unbootstrap(input: BootstrapInput): Promise<void>

  undeploy(input: UndeployInput): Promise<UndeployOutput>
  unstoreEnv(input: UnstoreEnvInput): Promise<UnstoreEnvOutput>
}

export type BootstrapInput = {
  force?: boolean
}

export type ProvisionInput = {
  canonicalName: string
  env?: {[key: string]: string}
  iacType: IacType
  id: string
  parameters?: {[key: string]: string}
  pkgName: string
  pkgUrl: string
}

export type ProvisionOutput =
  | {
      env: {[key: string]: string}
      success: true
    }
  | {
      reason: string
      success: false
    }

export type DestroyInput = ProvisionInput

export type DestroyOutput = ProvisionOutput

export type DeployInput = ProvisionInput & {
  projectEnv: {[key: string]: string}
  projectRootDir: string
}

export type DeployOutput = ProvisionOutput

export type UndeployInput = DeployInput
export type UndeployOutput = DeployOutput

export type ResolveEnvInput = {
  value: string
}

export type ResolveEnvOutput = {
  isSecret?: boolean
  value: string
}

export type SaveEnvInput = {
  env: {[key: string]: string}
  id: string
}

export type SaveEnvOutput =
  | {
      reason: string
      success: false
    }
  | {
      success: true
    }

export type StoreEnvInput = {
  name: string
  oldValue?: string
  sensitive?: boolean
  value: string
}

export type StoreEnvOutput =
  | {
      reason: string
      success: false
    }
  | {
      success: true
      value: string
    }

export type UnstoreEnvInput = {
  value: string
}

export type UnstoreEnvOutput =
  | {
      reason: string
      success: false
    }
  | {
      success: true
    }
