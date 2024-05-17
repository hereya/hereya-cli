import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';

import { Config } from '../lib/config/common.js';
import { getAnyPath } from '../lib/filesystem.js';
import { load, save } from '../lib/yaml-utils.js';
import { Backend, CreateWorkspaceInput, CreateWorkspaceOutput, InitProjectInput, InitProjectOutput } from './common.js';

const WorkspaceSchema = z.object({
    id: z.string().min(2),
    name: z.string().min(2),
})

export class LocalBackend implements Backend {

    async createWorkspace(input: CreateWorkspaceInput): Promise<CreateWorkspaceOutput> {
        const workspacesDir = path.join(os.homedir(), '.hereya', 'state', 'workspaces')
        const workspacePath = await getAnyPath(
            path.join(workspacesDir, `${input.name}.yaml`),
            path.join(workspacesDir, `${input.name}.yml`),
        )
        const { data, found } = await load<{ id: string; name: string }>(workspacePath)

        if (found) {
            const existingWorkspace$ = WorkspaceSchema.safeParse(data)
            if (!existingWorkspace$.success) {
                return {
                    reason: existingWorkspace$.error.message,
                    success: false,
                }
            }

            return {
                isNew: false,
                success: true,
                workspace: WorkspaceSchema.parse(data),
            }
        }

        const workspace = {
            id: input.name,
            name: input.name,
        }
        try {
            await save(workspace, workspacePath)
        } catch (error: any) {
            return {
                reason: error.message,
                success: false,
            }
        }

        return {
            isNew: true,
            success: true,
            workspace,
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
}


