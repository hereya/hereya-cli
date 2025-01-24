import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {z} from 'zod'

import {InfrastructureType} from '../infrastructure/common.js'
import {getInfrastructure} from '../infrastructure/index.js'
import {Config} from '../lib/config/common.js'
import {resolveEnvValues} from '../lib/env-utils.js'
import {getAnyPath} from '../lib/filesystem.js'
import {load, save} from '../lib/yaml-utils.js'
import {
  AddPackageToWorkspaceInput,
  AddPackageToWorkspaceOutput,
  Backend,
  CreateWorkspaceInput,
  CreateWorkspaceOutput,
  DeleteWorkspaceInput,
  DeleteWorkspaceOutput,
  GetProvisioningIdInput,
  GetProvisioningIdOutput,
  GetStateInput,
  GetStateOutput,
  GetWorkspaceEnvInput,
  GetWorkspaceEnvOutput,
  GetWorkspaceOutput,
  InitProjectInput,
  InitProjectOutput,
  RemovePackageFromWorkspaceInput,
  RemovePackageFromWorkspaceOutput,
  SetEnvVarInput,
  SetEnvVarOutput,
  UnsetEnvVarInput,
  UnsetEnvVarOutput,
} from './common.js'

const WorkspaceSchema = z.object({
  env: z.record(z.string()).optional(),
  id: z.string().min(2),
  name: z.string().min(2),
  packages: z
    .record(
      z.object({
        parameters: z.record(z.any()).optional(),
        version: z.string(),
      }),
    )
    .optional(),
})

export class LocalBackend implements Backend {
  async addPackageToWorkspace(input: AddPackageToWorkspaceInput): Promise<AddPackageToWorkspaceOutput> {
    const workspace$ = await this.getWorkspace(input.workspace)
    if (!workspace$.found) {
      return {
        reason: `Workspace ${input.workspace} not found`,
        success: false,
      }
    }

    if (workspace$.hasError) {
      return {
        reason: workspace$.error,
        success: false,
      }
    }

    const {workspace} = workspace$
    workspace.packages = {
      ...workspace.packages,
      [input.package]: {
        parameters: input.parameters,
        version: '',
      },
    }
    const newEnv = Object.fromEntries(Object.entries(input.env).map(([key, value]) => [key, `${input.infra}:${value}`]))
    workspace.env = {
      ...workspace.env,
      ...newEnv,
    }

    try {
      await this.saveWorkspace(workspace, input.workspace)
      return {
        success: true,
        workspace,
      }
    } catch (error: any) {
      return {
        reason: error.message,
        success: false,
      }
    }
  }

  async createWorkspace(input: CreateWorkspaceInput): Promise<CreateWorkspaceOutput> {
    const workspace$ = await this.getWorkspace(input.name)
    if (workspace$.found) {
      return workspace$.hasError
        ? {
            reason: workspace$.error,
            success: false,
          }
        : {
            isNew: false,
            success: true,
            workspace: workspace$.workspace,
          }
    }

    const workspace = {
      id: input.name,
      name: input.name,
    }
    try {
      await this.saveWorkspace(workspace, input.name)
      return {
        isNew: true,
        success: true,
        workspace,
      }
    } catch (error: any) {
      return {
        reason: error.message,
        success: false,
      }
    }
  }

  async deleteWorkspace(input: DeleteWorkspaceInput): Promise<DeleteWorkspaceOutput> {
    const workspace$ = await this.getWorkspace(input.name)
    if (!workspace$.found) {
      return {
        message: `Workspace ${input.name} does not exist`,
        success: true,
      }
    }

    if (workspace$.hasError) {
      return {
        reason: workspace$.error,
        success: false,
      }
    }

    const {workspace} = workspace$
    if (Object.keys(workspace.packages ?? {}).length > 0) {
      return {
        reason: `Cannot delete workspace ${input.name} because it has packages`,
        success: false,
      }
    }

    const workspacePath = await this.getWorkspacePath(input.name)
    await fs.rm(workspacePath)

    return {
      success: true,
    }
  }

  async getProvisioningId(input: GetProvisioningIdInput): Promise<GetProvisioningIdOutput> {
    const id = (
      input.project || input.workspace
        ? [input.project, input.workspace, input.packageCanonicalName]
        : [input.packageCanonicalName]
    )
      .filter(Boolean)
      .join('')
      .replaceAll(/[^\dA-Za-z]/g, '')
    return {
      id,
      success: true,
    }
  }

  async getState(input: GetStateInput): Promise<GetStateOutput> {
    await this.migrateProjectState(input)
    const projectStatePath = await this.getProjectStatePath(input)
    const {data, found} = await load<Config>(projectStatePath)

    if (found) {
      return {
        config: data,
        found: true,
      }
    }

    return {
      found: false,
    }
  }

  async getWorkspace(workspace: string): Promise<GetWorkspaceOutput> {
    const workspacePath = await getAnyPath(
      path.join(os.homedir(), '.hereya', 'state', 'workspaces', `${workspace}.yaml`),
      path.join(os.homedir(), '.hereya', 'state', 'workspaces', `${workspace}.yml`),
    )
    const {data, found} = await load<{id: string; name: string}>(workspacePath)

    if (found) {
      const workspace$ = WorkspaceSchema.safeParse(data)
      if (!workspace$.success) {
        return {
          error: workspace$.error.message,
          found: true,
          hasError: true,
        }
      }

      return {
        found: true,
        hasError: false,
        workspace: workspace$.data,
      }
    }

    return {
      found: false,
    }
  }

  async getWorkspaceEnv(input: GetWorkspaceEnvInput): Promise<GetWorkspaceEnvOutput> {
    const workspace$ = await this.getWorkspace(input.workspace)
    if (!workspace$.found) {
      return {
        reason: `Workspace ${input.workspace} not found`,
        success: false,
      }
    }

    if (workspace$.hasError) {
      return {
        reason: workspace$.error,
        success: false,
      }
    }

    return {
      env: await resolveEnvValues(workspace$.workspace.env ?? {}),
      success: true,
    }
  }

  async init(options: InitProjectInput): Promise<InitProjectOutput> {
    return {
      project: {
        id: options.project,
        name: options.project,
      },
      workspace: {
        id: options.workspace,
        name: options.workspace,
      },
    }
  }

  async removePackageFromWorkspace(input: RemovePackageFromWorkspaceInput): Promise<RemovePackageFromWorkspaceOutput> {
    const workspace$ = await this.getWorkspace(input.workspace)
    if (!workspace$.found) {
      return {
        reason: `Workspace ${input.workspace} not found`,
        success: false,
      }
    }

    if (workspace$.hasError) {
      return {
        reason: workspace$.error,
        success: false,
      }
    }

    const {workspace} = workspace$
    workspace.packages = Object.fromEntries(
      Object.entries(workspace.packages ?? {}).filter(([key]) => key !== input.package),
    )

    workspace.env = Object.fromEntries(Object.entries(workspace.env ?? {}).filter(([key]) => !(key in input.env)))

    try {
      await this.saveWorkspace(workspace, input.workspace)
      return {
        success: true,
        workspace,
      }
    } catch (error: any) {
      return {
        reason: error.message,
        success: false,
      }
    }
  }

  async saveState(config: Config, workspace?: string): Promise<void> {
    await this.migrateProjectState({
      project: config.project,
      workspace: workspace ?? config.workspace,
    })
    const projectStatePath = await this.getProjectStatePath({
      project: config.project,
      workspace: workspace ?? config.workspace,
    })
    await save({...config, workspace: workspace ?? config.workspace}, projectStatePath)
  }

  async setEnvVar(input: SetEnvVarInput): Promise<SetEnvVarOutput> {
    const workspace$ = await this.getWorkspace(input.workspace)
    if (!workspace$.found) {
      return {
        reason: `Workspace ${input.workspace} not found`,
        success: false,
      }
    }

    if (workspace$.hasError) {
      return {
        reason: workspace$.error,
        success: false,
      }
    }

    const {workspace} = workspace$

    const infrastructure$ = getInfrastructure({type: input.infra})
    if (!infrastructure$.supported) {
      return {
        reason: `Infrastructure ${input.infra} not found`,
        success: false,
      }
    }

    const {infrastructure} = infrastructure$
    const setEnvVarOutput = await infrastructure.storeEnv({
      name: input.name,
      oldValue: workspace.env?.[input.name]?.split(':').slice(1).join(':'),
      sensitive: input.sensitive,
      value: input.value,
    })

    if (!setEnvVarOutput.success) {
      return {
        reason: setEnvVarOutput.reason,
        success: false,
      }
    }

    workspace.env = {
      ...workspace.env,
      [input.name]: `${input.infra}:${setEnvVarOutput.value}`,
    }

    await this.saveWorkspace(workspace, input.workspace)

    return {
      success: true,
    }
  }

  async unsetEnvVar(input: UnsetEnvVarInput): Promise<UnsetEnvVarOutput> {
    const workspace$ = await this.getWorkspace(input.workspace)
    if (!workspace$.found) {
      return {
        reason: `Workspace ${input.workspace} not found`,
        success: false,
      }
    }

    if (workspace$.hasError) {
      return {
        reason: workspace$.error,
        success: false,
      }
    }

    const {workspace} = workspace$
    const value = workspace.env?.[input.name]
    if (!value) {
      return {
        success: true,
      }
    }

    const infra = value.split(':')[0] as InfrastructureType
    const infrastructure$ = getInfrastructure({type: infra})
    if (!infrastructure$.supported) {
      return {
        reason: `Infrastructure ${infra} not found`,
        success: false,
      }
    }

    const {infrastructure} = infrastructure$
    const unsetEnvVarOutput = await infrastructure.unstoreEnv({
      value: value.split(':').slice(1).join(':'),
    })
    if (!unsetEnvVarOutput.success) {
      return {
        reason: unsetEnvVarOutput.reason,
        success: false,
      }
    }

    workspace.env = Object.fromEntries(Object.entries(workspace.env ?? {}).filter(([key]) => key !== input.name))
    await this.saveWorkspace(workspace, input.workspace)
    return {
      success: true,
    }
  }

  private async getOldProjectStatePath(input: GetStateInput): Promise<string> {
    return getAnyPath(
      path.join(os.homedir(), '.hereya', 'state', 'projects', `${input.project}.yaml`),
      path.join(os.homedir(), '.hereya', 'state', 'projects', `${input.project}.yml`),
    )
  }

  private async getProjectStatePath(input: GetStateInput): Promise<string> {
    return getAnyPath(
      path.join(os.homedir(), '.hereya', 'state', 'projects', input.workspace, `${input.project}.yaml`),
      path.join(os.homedir(), '.hereya', 'state', 'projects', input.workspace, `${input.project}.yml`),
    )
  }

  private async getWorkspacePath(name: string): Promise<string> {
    return getAnyPath(
      path.join(os.homedir(), '.hereya', 'state', 'workspaces', `${name}.yaml`),
      path.join(os.homedir(), '.hereya', 'state', 'workspaces', `${name}.yml`),
    )
  }

  private async migrateProjectState(input: GetStateInput): Promise<void> {
    const oldProjectStatePath = await this.getOldProjectStatePath(input)
    const newProjectStatePath = await this.getProjectStatePath(input)
    const newProjectStateDir = path.dirname(newProjectStatePath)
    await fs.mkdir(newProjectStateDir, { recursive: true })
    try {
      await fs.access(oldProjectStatePath)
      await fs.rename(oldProjectStatePath, newProjectStatePath)
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error
      }
    }
  }

  private async saveWorkspace(data: z.infer<typeof WorkspaceSchema>, name: string) {
    const workspacePath = await this.getWorkspacePath(name)
    await save(data, workspacePath)
  }
}
