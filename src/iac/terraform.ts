import { mapObject } from '../lib/object-utils.js';
import { runShell } from '../lib/shell.js';
import { ApplyInput, ApplyOutput, DestroyInput, DestroyOutput, Iac } from './common.js';

export class Terraform implements Iac {
    async apply(input: ApplyInput): Promise<ApplyOutput> {
        try {
            runShell(
                'terraform',
                ['init'],
                {
                    directory: input.pkgPath,
                    env: Object.assign(
                        input.env,
                        mapObject(input.parameters ?? {}, (key, value) => [`TF_VAR_${key}`, value])
                    )
                }
            )
            runShell(
                'terraform',
                ['apply', '-auto-approve'],
                {
                    directory: input.pkgPath,
                    env: Object.assign(
                        input.env,
                        mapObject(input.parameters ?? {}, (key, value) => [`TF_VAR_${key}`, value])
                    )
                }
            )
            const env = await this.getEnv(input.pkgPath)
            return {
                env,
                success: true
            }

        } catch (error: any) {
            return {
                reason: error.message,
                success: false
            }
        }
    }

    async destroy(input: DestroyInput): Promise<DestroyOutput> {
        const applyOutput = await this.apply(input)
        if (!applyOutput.success) {
            return applyOutput
        }

        const { env } = applyOutput
        try {
            runShell(
                'terraform',
                ['destroy', '-auto-approve'],
                {
                    directory: input.pkgPath,
                    env: Object.assign(
                        input.env,
                        mapObject(input.parameters ?? {}, (key, value) => [`TF_VAR_${key}`, value])
                    )
                }
            )
            return {
                env,
                success: true
            }
        } catch (error: any) {
            return {
                reason: error.message,
                success: false
            }
        }
    }

    private async getEnv(pkgPath: string): Promise<{ [k: string]: string }> {
        const resourceOut = runShell(
            'terraform',
            ['output', '--json'],
            {
                directory: pkgPath,
                stdio: 'pipe'
            }
        )

        let outStr = resourceOut.output.toString().trim()

        const start = outStr.indexOf('{')
        const end = outStr.lastIndexOf('}')
        outStr = outStr.slice(start, end + 1)

        const tfEnvObj = JSON.parse(outStr)

        const tfEnv: { [k: string]: string } = {}
        // eslint-disable-next-line guard-for-in
        for (const key in tfEnvObj) {
            tfEnv[key] = tfEnvObj[key].value
        }

        return tfEnv
    }

}
