import {IPackageMetadata} from '../lib/package/index.js'

export type ExecutorProvisionInput = {
  isDeploying?: boolean
  package: string
  parameters?: {[key: string]: string}
  project?: string
  projectEnv?: {[key: string]: string}
  projectRootDir?: string
  skipDeploy?: boolean
  workspace?: string
}

export type ExecutorProvisionOutput =
  | {
      env: {[key: string]: string}
      metadata: IPackageMetadata
      success: true
    }
  | {
      reason: string
      success: false
    }

export type ExecutorDestroyInput = ExecutorProvisionInput

export type ExecutorDestroyOutput = ExecutorProvisionOutput

export interface Executor {
  destroy(input: ExecutorDestroyInput): Promise<ExecutorDestroyOutput>
  provision(input: ExecutorProvisionInput): Promise<ExecutorProvisionOutput>
}
