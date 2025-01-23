import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import type { GetRepoContentInput, GetRepoContentOutput, PackageManager } from './common.js'

import { downloadPackage } from './index.js'

export class GitHubPackageManager implements PackageManager {
  async getRepoContent({owner, path: filePath, repo}: GetRepoContentInput): Promise<GetRepoContentOutput> {
    const pkgUrl = `https://github.com/${owner}/${repo}`
    const tmpFolder = path.join(os.tmpdir(), 'hereya', 'github', owner, repo)

    try {
      const destPath = await downloadPackage(pkgUrl, tmpFolder)
      if (await fs.stat(path.join(destPath, filePath))) {
        const content = await fs.readFile(path.join(destPath, filePath), 'utf8')
        // remove the tmp folder
        await fs.rm(destPath, {recursive: true})
        return {
          content,
          found: true,
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
