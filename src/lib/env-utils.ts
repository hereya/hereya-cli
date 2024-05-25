import { InfrastructureType } from '../infrastructure/common.js';
import { getInfrastructure } from '../infrastructure/index.js';

export function logEnv(env: { [key: string]: string }, logFn: (_: string) => void = console.log): void {
    for (const [key, value] of Object.entries(env)) {
        logFn(`${key}=${value}`)
    }
}


export async function resolveEnvValues(env: { [key: string]: string }, options: {
    markSecret?: boolean
} = {}): Promise<{ [key: string]: string }> {
    return Object.fromEntries(
        await Promise.all(
            Object.entries(env)
            .map(async ([key, value]) => {
                const infraType = value.split(':')[0] as InfrastructureType
                const infra$ = getInfrastructure({ type: infraType })
                if (!infra$.supported) {
                    throw new Error(infra$.reason)
                }

                const { infrastructure } = infra$
                const valueWithoutInfra = value.split(':').slice(1).join(':')
                const { isSecret, value: resolvedValue } = await infrastructure.resolveEnv({
                    value: valueWithoutInfra
                })
                const finalValue = options.markSecret && isSecret ? `secret://${resolvedValue}` : resolvedValue
                return [key, finalValue]
            })
        )
    );
}
