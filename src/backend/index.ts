import { Backend } from './common.js';
import { LocalBackend } from './local.js';

export async function getBackend(): Promise<Backend> {
    return new LocalBackend();
}
