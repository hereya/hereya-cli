import { access, constants } from 'node:fs/promises';

export async function getAnyPath(...candidates: string[]) {
    for (const p of candidates) {
        try {
            await access(p, constants.R_OK | constants.W_OK)
            return p
        } catch (error) {
        }
    }
    return candidates[0]
}
