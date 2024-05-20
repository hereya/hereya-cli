import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';

import { Config } from '../lib/config/common.js';
import { resolveEnvValues } from '../lib/env-utils.js';
import { getAnyPath } from '../lib/filesystem.js';
import { load, save } from '../lib/yaml-utils.js';
import {
    AddPackageToWorkspaceInput,
    AddPackageToWorkspaceOutput,
    Backend,
    CreateWorkspaceInput,
    CreateWorkspaceOutput,
    GetStateInput,
    GetStateOutput,
    GetWorkspaceEnvInput,
    GetWorkspaceEnvOutput,
    GetWorkspaceOutput,
    InitProjectInput,
    InitProjectOutput,
    RemovePackageFromWorkspaceInput,
    RemovePackageFromWorkspaceOutput,
} from './common.js';


const WorkspaceSchema = z.object({
    env: z.record(z.string()).optional(),
    id: z.string().min(2),
    name: z.string().min(2),
    packages: z.record(z.object({
        parameters: z.record(z.any()).optional(),
        version: z.string(),
    })).optional(),
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

        const { workspace } = workspace$
        workspace.packages = {
            ...workspace.packages,
            [input.package]: {
                parameters: input.parameters,
                version: '',
            },
        }
        const newEnv = Object.fromEntries(
            Object.entries(input.env)
            .map(([key, value]) => [key, `${input.infra}:${value}`])
        )
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
            return workspace$.hasError ? {
                reason: workspace$.error,
                success: false,
            } : {
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

    async getState(input: GetStateInput): Promise<GetStateOutput> {
        const projectStatePath = await this.getProjectStatePath(input.project)
        const { data, found } = await load<Config>(projectStatePath)

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
        const { data, found } = await load<{ id: string; name: string }>(workspacePath)

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

        const { workspace } = workspace$
        workspace.packages = Object.fromEntries(
            Object.entries(workspace.packages ?? {})
            .filter(([key]) => key !== input.package)
        )

        workspace.env = Object.fromEntries(
            Object.entries(workspace.env ?? {})
            .filter(([key]) => !(key in input.env))
        )

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

    async saveState(config: Omit<Config, 'workspace'>): Promise<void> {
        const projectStatePath = await this.getProjectStatePath(config.project)
        await save(config, projectStatePath)
    }

    private async getProjectStatePath(project: string): Promise<string> {
        return getAnyPath(
            path.join(os.homedir(), '.hereya', 'state', 'projects', `${project}.yaml`),
            path.join(os.homedir(), '.hereya', 'state', 'projects', `${project}.yml`),
        )
    }

    private async saveWorkspace(data: z.infer<typeof WorkspaceSchema>, name: string) {
        const workspacePath = await getAnyPath(
            path.join(os.homedir(), '.hereya', 'state', 'workspaces', `${name}.yaml`),
            path.join(os.homedir(), '.hereya', 'state', 'workspaces', `${name}.yml`),
        )
        await save(data, workspacePath)
    }
}


