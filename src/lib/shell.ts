import { spawnSync, StdioOptions } from 'node:child_process';

export type RunShellOptions = {
    directory?: string
    env?: NodeJS.ProcessEnv
    stdio?: StdioOptions
}

export function runShell(cmd: string, args: string[], options: RunShellOptions = {}): ReturnType<typeof spawnSync> {
    // Run the command
    const result = spawnSync(cmd, args, {
        cwd: options.directory ?? process.cwd(),
        stdio: options.stdio ?? 'inherit',
        env: Object.assign({}, process.env, options.env ?? {}),
    })

    // Throw an error if the command failed
    if (result.status !== 0) {
        throw new Error(`Command "${cmd} ${args.join(' ')}" failed with exit code "${result.status}"`)
    }

    return result
}
