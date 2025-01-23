import * as yaml from 'yaml'
import { z } from 'zod'

import { IacType } from '../../iac/common.js'
import { InfrastructureType } from '../../infrastructure/common.js'
import { PackageManager } from './common.js'
import { GitHubPackageManager } from './github.js'

export const packageManager: PackageManager = new GitHubPackageManager()

export function getPackageManager(): PackageManager {
  return packageManager
}

export async function resolvePackage(input: ResolvePackageInput): Promise<ResolvePackageOutput> {
  const pkgParts = input.package.split('/')
  if (pkgParts.length !== 2) {
    return {found: false, reason: 'Invalid package format. Use owner/repository'}
  }

  const [owner, repo] = pkgParts
  const packageManager = getPackageManager()
  const metadataContentCandidates = (
    await Promise.all([
      packageManager.getRepoContent({owner, path: 'hereyarc.yaml', repo}),
      packageManager.getRepoContent({owner, path: 'hereyarc.yml', repo}),
    ])
  ).filter((content$) => content$.found)

  if (metadataContentCandidates.length === 0) {
    return {found: false, reason: `No hereya metadata file found in ${input.package}`}
  }

  const metadataContent$ = metadataContentCandidates[0] as {content: string, pkgUrl: string}
  try {
    const metadata = PackageMetadata.parse(yaml.parse(metadataContent$.content))

    if (!metadata.deploy && metadata.dependencies) {
      return {found: false, reason: 'Package has dependencies but is not a deploy package'}
    }

    if (input.isDeploying && metadata.onDeploy) {
      return resolvePackage({package: metadata.onDeploy.pkg})
    }

    return {
      canonicalName: getPackageCanonicalName(input.package),
      found: true,
      metadata,
      packageUri: metadataContent$.pkgUrl,
      pkgName: input.package,
    }
  } catch (error: any) {
    return {found: false, reason: error.message}
  }
}

export function getPackageCanonicalName(packageName: string): string {
  return packageName.replace('/', '-')
}

export async function downloadPackage(pkgUrl: string, destPath: string) {
  const packageManager = getPackageManager()
  return packageManager.downloadPackage(pkgUrl, destPath)
}

export type ResolvePackageInput = {
  isDeploying?: boolean
  package: string
}

export type ResolvePackageOutput =
  | {
      canonicalName: string
      found: true
      metadata: z.infer<typeof PackageMetadata>
      packageUri: string
      pkgName: string
    }
  | {
      found: false
      reason: string
    }

export const PackageMetadata = z.object({
  dependencies: z.record(z.string()).optional(),
  deploy: z.boolean().optional(),
  iac: z.nativeEnum(IacType),
  infra: z.nativeEnum(InfrastructureType),
  onDeploy: z
    .object({
      pkg: z.string(),
      version: z.string(),
    })
    .optional(),
  originalInfra: z.nativeEnum(InfrastructureType).optional(),
})

export type IPackageMetadata = z.infer<typeof PackageMetadata>
