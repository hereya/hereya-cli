import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {simpleGit} from 'simple-git'
import {BackOffPolicy, Retryable} from 'typescript-retry-decorator'

import type {GetRepoContentInput, GetRepoContentOutput, PackageManager} from './common.js'

import {isNotEmpty} from '../filesystem.js'

export class GitHubPackageManager implements PackageManager {
  constructor(private readonly registryUrl: string = process.env.HEREYA_REGISTRY_URL || 'https://github.com') {}

  // eslint-disable-next-line new-cap
  @Retryable({
    backOff: 1000,
    backOffPolicy: BackOffPolicy.ExponentialBackOffPolicy,
    exponentialOption: {maxInterval: 4000, multiplier: 3},
    maxAttempts: 3,
  })
  async downloadPackage(pkgUrl: string, destPath: string): Promise<string> {
    if (await isNotEmpty(destPath)) {
      return destPath
    }

    await fs.mkdir(destPath, {recursive: true})

    // Initialize simple-git
    const git = simpleGit()

    // Clone repository into temp directory
    await git.clone(pkgUrl, destPath, ['--depth=1'])
    return destPath
  }

  async getRepoContent({owner, path: filePath, repo}: GetRepoContentInput): Promise<GetRepoContentOutput> {
    const pkgUrl = `${this.registryUrl}/${owner}/${repo}`
    const tmpFolder = path.join(os.tmpdir(), 'hereya', 'github', owner, repo)

    try {
      const destPath = await this.downloadPackage(pkgUrl, tmpFolder)
      if (await fs.stat(path.join(destPath, filePath))) {
        const content = await fs.readFile(path.join(destPath, filePath), 'utf8')
        // remove the tmp folder
        await fs.rm(destPath, {recursive: true})
        return {
          content,
          found: true,
          pkgUrl,
        }
      }

      return {
        found: false,
        reason: `File ${filePath} not found in ${pkgUrl}`,
      }
    } catch (error: any) {
      return {
        found: false,
        reason: error.message,
      }
    }
  }
}
