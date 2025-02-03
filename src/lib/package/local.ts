import fs from 'node:fs/promises'
import path from 'node:path'

import {
  GetRepoContentInput,
  GetRepoContentOutput,
  PackageManager,
} from './common.js'

export class LocalPackageManager implements PackageManager {
  async downloadPackage(pkgUrl: string, destPath: string): Promise<string> {
    const [, source] = pkgUrl.split('://')
    await fs.cp(source, destPath, {recursive: true})
    return destPath
  }

  async getRepoContent({ path: filePath, repo}: GetRepoContentInput): Promise<GetRepoContentOutput> {
    try {
        const resolvedPath = path.join(repo, filePath)
        if (await fs.stat(resolvedPath)) {
            const content = await fs.readFile(resolvedPath, 'utf8')
            return {
              content,
              found: true,
              pkgUrl: `local://${repo}`,
            }
          }
    
          return {
            found: false,
            reason: `File ${filePath} not found in ${repo}`,
          }
    } catch (error: any) {
        return {
            found: false,
            reason: error.message,
          }
    }
  }
}
