import { ApplyInput, ApplyOutput, Iac } from './common.js';
import { runShell } from '../lib/shell.js';

export class Terraform implements Iac {
    async apply(input: ApplyInput): Promise<ApplyOutput> {
        try {
            runShell(
                'terraform',
                ['init'],
                {
                    directory: input.pkgPath,
                    env: input.env
                }
            )
            runShell(
                'terraform',
                ['apply', '-auto-approve'],
                {
                    directory: input.pkgPath,
                    env: input.env
                }
            )
            const env = await this.getEnv(input.pkgPath)
            return {
                success: true,
                env
            }

        } catch (error: any) {
            return {
                success: false,
                reason: error.message
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
