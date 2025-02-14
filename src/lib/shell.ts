import {spawnSync, StdioOptions} from 'node:child_process'

let debug = false

export function setDebug(value: boolean) {
  debug = value
}

export function isDebug() {
  return debug
}

export type RunShellOptions = {
  directory?: string
  env?: NodeJS.ProcessEnv
  stdio?: StdioOptions
}

export function runShell(cmd: string, args: string[], options: RunShellOptions = {}): ReturnType<typeof spawnSync> {
  // Run the command
  const result = spawnSync(cmd, args, {
    cwd: options.directory ?? process.cwd(),
    encoding: 'utf8',
    env: {...process.env, ...options.env},
    shell: true,
    stdio: options.stdio ?? (isDebug() ? 'inherit' : 'ignore'),
  })

  // Throw an error if the command failed
  if (result.status !== 0) {
    throw new Error(`Command "${cmd} ${args.join(' ')}" failed with exit code "${result.status}"`)
  }

  return result
}

export function delay(ms: number) {
  if (process.env.NODE_ENV === 'test') {
    return
  }

  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
