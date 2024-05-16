import { PackageManager } from './common.js';
import { GitHubPackageManager } from './github.js';
import { MockPackageManager } from './mock.js';
import * as yaml from 'yaml';
import { z } from 'zod';
import { IacType } from '../../iac/common.js';
import { InfrastructureType } from '../../infrastructure/common.js';

export function getPackageManager(): PackageManager {
    if (process.env.USE_MOCK) return new MockPackageManager();
    return new GitHubPackageManager()
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
        packageManager.getRepoContent({ owner, repo, path: 'hereyarc.yaml' }),
        packageManager.getRepoContent({ owner, repo, path: 'hereyarc.yml' }),
    ])).filter(content$ => content$.found)

    if (metadataContentCandidates.length === 0) {
        return { found: false, reason: `No hereya metadata file found in ${pkgUrl}` }
    }

    const metadataContent$ = metadataContentCandidates[0] as { content: string }
    const metadata = PackageMetadata.parse(yaml.parse(metadataContent$.content))

    return {
        found: true,
        packageUri: pkgUrl,
        metadata,
        canonicalName: input.package.replace('/', '-')
    }
}

export type ResolvePackageInput = {
    package: string
}

export type ResolvePackageOutput = {
    found: true
    canonicalName: string
    packageUri: string
    metadata: z.infer<typeof PackageMetadata>
} | {
    found: false
    reason: string
}

export const PackageMetadata = z.object({
    iac: z.nativeEnum(IacType),
    infra: z.nativeEnum(InfrastructureType),
});
