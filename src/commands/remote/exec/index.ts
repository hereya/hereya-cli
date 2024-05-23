import { Args, Command, Flags } from '@oclif/core'

import { ApplyInput, DestroyInput, IacType } from '../../../iac/common.js';
import { getIac } from '../../../iac/index.js';
import { save } from '../../../lib/yaml-utils.js';

export default class RemoteExec extends Command {
    static override args = {
        pkgPath: Args.string({
            description: 'The path to the package to provision or destroy',
            required: true,
        }),
    }

    static override description = 'remotely provision or destroy a package'

    static override examples = [
        '<%= config.bin %> <%= command.id %>',
    ]

    static override flags = {
        output: Flags.string({
            char: 'o',
            description: 'The path to store the output env in',
            required: true,
        }),
    }

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(RemoteExec)

        const workspaceEnv = Object.fromEntries(
            (process.env.HEREYA_WORKSPACE_ENV?.split(',') ?? []).map(param => param.split('=')),
        )
        const parameters = Object.fromEntries(
            (process.env.HEREYA_PARAMETERS?.split(',') ?? []).map(param => param.split('=')),
        )
        const id = process.env.HEREYA_ID
        const iacType = process.env.HEREYA_IAC_TYPE
        const destroy = process.env.HEREYA_DESTROY === 'true'

        if (!id || !iacType) {
            return this.error('missing required environment variables')
        }

        const input = {
            env: workspaceEnv, id, parameters, pkgPath: args.pkgPath
        } satisfies ApplyInput

        const iac$ = getIac({ type: iacType as IacType });
        if (!iac$.supported) {
            return this.error(iac$.reason)
        }

        const { iac } = iac$;
        const output = await (destroy ? iac.destroy(input as DestroyInput) : iac.apply(input as ApplyInput));

        if (!output.success) {
            return this.error(output.reason)
        }

        await save(output.env, flags.output)
        this.log(`Output env saved to ${flags.output}`)

    }
}
