import { GetWorkspaceEnvOutput } from '../backend/common.js'
import { getBackend } from '../backend/index.js'
import { destroyPackage, provisionPackage } from '../infrastructure/index.js'
import {
    Executor,
    ExecutorDestroyInput,
    ExecutorDestroyOutput,
    ExecutorProvisionInput,
    ExecutorProvisionOutput,
} from './interface.js'

export class LocalExecutor implements Executor {
  async destroy(input: ExecutorDestroyInput): Promise<ExecutorDestroyOutput> {
    const getWorkspaceEnvOutput = await this.getWorkspaceEnv({
      project: input.project,
      workspace: input.workspace,
    })
    if (!getWorkspaceEnvOutput.success) {
      return {reason: getWorkspaceEnvOutput.reason, success: false}
    }

    return destroyPackage({
      ...input,
      env: getWorkspaceEnvOutput.env,
    })
  }

  async provision(input: ExecutorProvisionInput): Promise<ExecutorProvisionOutput> {
    const getWorkspaceEnvOutput = await this.getWorkspaceEnv({
      project: input.project,
      workspace: input.workspace,
    })
    if (!getWorkspaceEnvOutput.success) {
      return {reason: getWorkspaceEnvOutput.reason, success: false}
    }

    return provisionPackage({
      ...input,
      env: getWorkspaceEnvOutput.env,
    })
  }

  private async getWorkspaceEnv({
    project,
    workspace,
  }: {
    project?: string
    workspace?: string
  }): Promise<GetWorkspaceEnvOutput> {
    if (!workspace || !project) {
      return {env: {}, success: true}
    }

    const backend = await getBackend()
    return backend.getWorkspaceEnv({
      project,
      workspace,
    })
  }
}
