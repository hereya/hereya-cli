export function logEnv(env: { [key: string]: string }, logFn: (_: string) => void = console.log): void {
    for (const [key, value] of Object.entries(env)) {
        logFn(`${key}=${value}`)
    }
}

