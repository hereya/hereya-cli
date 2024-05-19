import path from 'node:path';

import { getAnyPath } from '../filesystem.js';
import { getPackageCanonicalName } from '../package/index.js';
import { load, save } from '../yaml-utils.js';

export class ParameterManager {
    async getPackageParameters(input: GetPackageParametersInput): Promise<GetPackageParametersOutput> {
        const pkgName = getPackageCanonicalName(input.package)
        const fromFiles = await Promise.all([
            [`${pkgName}.yaml`, `${pkgName}.yml`],
            [`${pkgName}.${input.workspace}.yaml`, `${pkgName}.${input.workspace}.yml`],
        ].map(async ([filename, altFilename]) => {
            const filePath = await getAnyPath(
                path.join(input.projectRootDir ?? process.cwd(), 'hereyavars', filename),
                path.join(input.projectRootDir ?? process.cwd(), 'hereyavars', altFilename),
            )
            const { data: parameters } = await load<{ [k: string]: string }>(filePath)
            return parameters
        }))
        const fromUser = input.userSpecifiedParameters
        const parameters = Object.assign({}, ...fromFiles, fromUser ?? {})
        return { parameters }
    }

    async savePackageParameters(input: SavePackageParametersInput): Promise<SavePackageParametersOutput> {
        const pkgName = getPackageCanonicalName(input.package)
        const paramFilesExist = await Promise.all([
            [`${pkgName}.yaml`, `${pkgName}.yml`],
            [`${pkgName}.${input.workspace}.yaml`, `${pkgName}.${input.workspace}.yml`],
        ].map(async ([filename, altFilename]) => {
            const filePath = await getAnyPath(
                path.join(input.projectRootDir ?? process.cwd(), 'hereyavars', filename),
                path.join(input.projectRootDir ?? process.cwd(), 'hereyavars', altFilename),
            )
            const { found } = await load<{ [k: string]: string }>(filePath)
            return found
        }))
        if (paramFilesExist.some(Boolean)) {
            return {
                filePath: null,
                saved: false,
            }
        }

        const filePath = path.join(input.projectRootDir ?? process.cwd(), 'hereyavars', `${pkgName}.yaml`)

        await save(input.parameters, filePath)

        return {
            filePath,
            saved: true,
        }
    }
}

export const parameterManager = new ParameterManager()

export function getParameterManager() {
    return parameterManager
}


export type GetPackageParametersInput = {
    package: string;
    projectRootDir?: string
    userSpecifiedParameters?: { [key: string]: string }
    workspace: string;
}

export type GetPackageParametersOutput = {
    parameters: { [key: string]: string }
}

export type SavePackageParametersInput = {
    package: string;
    parameters: { [key: string]: string }
    projectRootDir?: string
    workspace: string;
}

export type SavePackageParametersOutput = {
    filePath: null
    saved: false
} | {
    filePath: string
    saved: true
}
