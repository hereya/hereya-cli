import os from 'node:os';
import path from 'node:path';
import { util, z } from 'zod';

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
    GetWorkspaceEnvInput,
    GetWorkspaceEnvOutput,
    InitProjectInput,
    InitProjectOutput
} from './common.js';

import Omit = util.Omit;

const WorkspaceSchema = z.object({
    env: z.record(z.string()).optional(),
    id: z.string().min(2),
    name: z.string().min(2),
    packages: z.record(z.object({
        version: z.string(),
    })).optional(),
})

export class LocalBackend implements Backend {

    async addPackageToWorkspace(input: AddPackageToWorkspaceInput): Promise<AddPackageToWorkspaceOutput> {
        const workspace$ = await this.loadWorkspace(input.workspace)
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

        const workspace = workspace$.data
        workspace.packages = {
            ...workspace.packages,
            [input.package]: {
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
        const workspace$ = await this.loadWorkspace(input.name)
        if (workspace$.found) {
            return workspace$.hasError ? {
                reason: workspace$.error,
                success: false,
            } : {
                isNew: false,
                success: true,
                workspace: workspace$.data,
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

    async getWorkspaceEnv(input: GetWorkspaceEnvInput): Promise<GetWorkspaceEnvOutput> {
        const workspace$ = await this.loadWorkspace(input.workspace)
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
            env: await resolveEnvValues(workspace$.data.env ?? {}),
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

    async saveState(config: Omit<Config, 'workspace'>): Promise<void> {
        const projectStatePath = await getAnyPath(
            path.join(os.homedir(), '.hereya', 'state', 'projects', `${config.project}.yaml`),
            path.join(os.homedir(), '.hereya', 'state', 'projects', `${config.project}.yml`),
        )
        await save(config, projectStatePath)
    }

    private async loadWorkspace(workspace: string): Promise<({
        data: z.infer<typeof WorkspaceSchema>,
        found: true,
        hasError: false
    } | { error: string, found: true, hasError: true }) | { found: false }> {
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
                data: workspace$.data,
                found: true,
                hasError: false,
            }
        }

        return {
            found: false,
        }
    }

    private async saveWorkspace(data: z.infer<typeof WorkspaceSchema>, name: string) {
        const workspacePath = await getAnyPath(
            path.join(os.homedir(), '.hereya', 'state', 'workspaces', `${name}.yaml`),
            path.join(os.homedir(), '.hereya', 'state', 'workspaces', `${name}.yml`),
        )
        await save(data, workspacePath)
    }
}


