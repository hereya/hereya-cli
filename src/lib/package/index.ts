import * as yaml from 'yaml';
import { z } from 'zod';

import { IacType } from '../../iac/common.js';
import { InfrastructureType } from '../../infrastructure/common.js';
import { PackageManager } from './common.js';
import { GitHubPackageManager } from './github.js';

export const packageManager: PackageManager = new GitHubPackageManager();

export function getPackageManager(): PackageManager {
    return packageManager;
}

export async function resolvePackage(input: ResolvePackageInput): Promise<ResolvePackageOutput> {
    const pkgParts = input.package.split('/')
    if (pkgParts.length !== 2) {
        return { found: false, reason: 'Invalid package format. Use owner/repository' }
    }

    const [owner, repo] = pkgParts
    const pkgUrl = `https://github.com/${input.package}`
    const packageManager = getPackageManager()
    const metadataContentCandidates = (await Promise.all([
        packageManager.getRepoContent({ owner, path: 'hereyarc.yaml', repo }),
        packageManager.getRepoContent({ owner, path: 'hereyarc.yml', repo }),
    ])).filter(content$ => content$.found)

    if (metadataContentCandidates.length === 0) {
        return { found: false, reason: `No hereya metadata file found in ${pkgUrl}` }
    }

    const metadataContent$ = metadataContentCandidates[0] as { content: string }
    try {
        const metadata = PackageMetadata.parse(yaml.parse(metadataContent$.content))
        return {
            canonicalName: getPackageCanonicalName(input.package),
            found: true,
            metadata,
            packageUri: pkgUrl
        }
    } catch (error: any) {
        return { found: false, reason: error.message }
    }
}

export function getPackageCanonicalName(packageName: string): string {
    return packageName.replace('/', '-')
}

export type ResolvePackageInput = {
    package: string
}

export type ResolvePackageOutput = {
    canonicalName: string
    found: true
    metadata: z.infer<typeof PackageMetadata>
    packageUri: string
} | {
    found: false
    reason: string
}

export const PackageMetadata = z.object({
    deploy: z.boolean().optional(),
    iac: z.nativeEnum(IacType),
    infra: z.nativeEnum(InfrastructureType),
});
