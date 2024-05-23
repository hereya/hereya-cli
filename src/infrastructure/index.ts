import { z } from 'zod';

import { PackageMetadata, resolvePackage } from '../lib/package/index.js';
import { AwsInfrastructure } from './aws.js';
import { Infrastructure, InfrastructureType } from './common.js';
import { LocalInfrastructure } from './local.js';


export const localInfrastructure = new LocalInfrastructure()
export const awsInfrastructure = new AwsInfrastructure()

export function getInfrastructure(input: GetInfrastructureInput): GetInfrastructureOutput {
    switch (input.type) {
        case InfrastructureType.local: {
            return {
                infrastructure: localInfrastructure,
                supported: true
            }
        }

        case InfrastructureType.aws: {
            return {
                infrastructure: awsInfrastructure,
                supported: true
            }
        }

        default: {
            return {
                reason: `Infrastructure type ${input.type} is not supported yet!`,
                supported: false
            }
        }
    }
}

export async function destroyPackage(input: DestroyPackageInput): Promise<DestroyPackageOutput> {
    const resolvePackageOutput = await resolvePackage({ package: input.package })
    if (!resolvePackageOutput.found) {
        return { reason: resolvePackageOutput.reason, success: false }
    }

    const { canonicalName, metadata, packageUri } = resolvePackageOutput
    const infrastructure$ = getInfrastructure({ type: metadata.infra })
    if (!infrastructure$.supported) {
        return { reason: infrastructure$.reason, success: false }
    }

    const { infrastructure } = infrastructure$
    const destroyOutput = await infrastructure.destroy({
        canonicalName,
        env: input.env,
        iacType: metadata.iac,
        id: ((input.project || input.workspace) ? [input.project, input.workspace, canonicalName] : [canonicalName])
        .filter(Boolean).join('')
        .replaceAll(/[^\dA-Za-z]/g, ''),
        parameters: input.parameters,
        pkgName: input.package,
        pkgUrl: packageUri,
    })
    if (!destroyOutput.success) {
        return { reason: destroyOutput.reason, success: false }
    }

    return { env: destroyOutput.env, metadata, success: true }
}

export async function provisionPackage(input: ProvisionPackageInput): Promise<ProvisionPackageOutput> {
    const resolvePackageOutput = await resolvePackage({ package: input.package })
    if (!resolvePackageOutput.found) {
        return { reason: resolvePackageOutput.reason, success: false }
    }

    const { canonicalName, metadata, packageUri } = resolvePackageOutput
    const infrastructure$ = getInfrastructure({ type: metadata.infra })
    if (!infrastructure$.supported) {
        return { reason: infrastructure$.reason, success: false }
    }

    const { infrastructure } = infrastructure$
    const provisionOutput = await infrastructure.provision({
        canonicalName,
        env: input.env,
        iacType: metadata.iac,
        id: ((input.project || input.workspace) ? [input.project, input.workspace, canonicalName] : [canonicalName])
        .filter(Boolean).join('')
        .replaceAll(/[^\dA-Za-z]/g, ''),
        parameters: input.parameters,
        pkgName: input.package,
        pkgUrl: packageUri,
    })
    if (!provisionOutput.success) {
        return { reason: provisionOutput.reason, success: false }
    }

    return { env: provisionOutput.env, metadata, success: true }
}

export type DestroyPackageInput = ProvisionPackageInput

export type DestroyPackageOutput = ProvisionPackageOutput

export type ProvisionPackageInput = {
    env?: { [key: string]: string }
    package: string
    parameters?: { [key: string]: string }
    project?: string
    workspace?: string
}

export type ProvisionPackageOutput = {
    env: { [key: string]: string }
    metadata: z.infer<typeof PackageMetadata>
    success: true
} | {
    reason: string
    success: false
}


export type GetInfrastructureInput = {
    type: InfrastructureType
}

export type GetInfrastructureOutput = {
    reason: string
    supported: false,
} | { infrastructure: Infrastructure, supported: true }



