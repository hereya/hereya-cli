import { access, constants } from 'node:fs/promises';

export async function getAnyPath(...candidates: string[]) {
    const checkAccess = async (index: number): Promise<string> => {
        if (index >= candidates.length) return candidates[0];
        try {
            await access(candidates[index], constants.W_OK);
            return candidates[index];
        } catch {
            return checkAccess(index + 1);
        }
    };

    return checkAccess(0);
}


export async function fileExists(filePath: string) {
    try {
        await access(filePath, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}
