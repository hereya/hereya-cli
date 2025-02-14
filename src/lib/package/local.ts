import fs from 'node:fs/promises'
import path from 'node:path'

import {GetRepoContentInput, GetRepoContentOutput, PackageManager} from './common.js'

export class LocalPackageManager implements PackageManager {
  async downloadPackage(pkgUrl: string, destPath: string): Promise<string> {
    const [, source] = pkgUrl.split('://')
    await copyRecursive(source, destPath)
    return destPath
  }

  async getRepoContent({path: filePath, repo}: GetRepoContentInput): Promise<GetRepoContentOutput> {
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

async function copyRecursive(src: string, dest: string) {
  // Ensure the destination directory exists.
  await fs.mkdir(dest, {recursive: true})

  // Read the contents of the source directory.
  const entries = await fs.readdir(src, {withFileTypes: true})

  // Loop through each entry in the directory.
  await Promise.all(
    entries.map(async (entry) => {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)

      return entry.isDirectory() ? copyRecursive(srcPath, destPath) : fs.copyFile(srcPath, destPath)
    }),
  )
}
