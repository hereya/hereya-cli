import { Backend } from './common.js';
import { LocalBackend } from './local.js';
import { randomUUID } from 'node:crypto';

export async function getBackend(): Promise<Backend> {
    if (process.env.NODE_ENV === 'test') {
        return {
            init: async (options) => {
                return {
                    project: { id: randomUUID(), name: options.project },
                    workspace: { id: randomUUID(), name: options.workspace }
                }
            }
        }
    }
    return new LocalBackend();
}
