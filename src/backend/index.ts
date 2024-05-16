import { Backend } from './common.js';
import { LocalBackend } from './local.js';
import { randomUUID } from 'node:crypto';
import { util } from 'zod';
import { Config } from '../lib/config/common.js';
import Omit = util.Omit;

export async function getBackend(): Promise<Backend> {
    if (process.env.NODE_ENV === 'test') {
        return {
            async init(options) {
                return {
                    project: { id: randomUUID(), name: options.project },
                    workspace: { id: randomUUID(), name: options.workspace }
                }
            },
            async saveState(config: Omit<Config, "workspace">): Promise<void> {
            }
        }
    }
    return new LocalBackend();
}
