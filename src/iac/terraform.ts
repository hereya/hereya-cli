import fs from 'node:fs';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Extract as decompress } from 'unzip-stream'

import { mapObject } from '../lib/object-utils.js';
import { runShell } from '../lib/shell.js';
import { ApplyInput, ApplyOutput, DestroyInput, DestroyOutput, Iac } from './common.js';

export class Terraform implements Iac {
    async apply(input: ApplyInput): Promise<ApplyOutput> {
        try {
            const terraform = await this.getTerraformBinary()

            runShell(
                terraform,
                ['init'],
                {
                    directory: input.pkgPath,
                    env: {
                        ...mapObject(input.env ?? {}, (key, value) => [`TF_VAR_${key}`, value]),
                        ...input.env,
                        ...mapObject(input.parameters ?? {}, (key, value) => [`TF_VAR_${key}`, value])
                    }
                }
            )
            runShell(
                terraform,
                ['apply', '-auto-approve'],
                {
                    directory: input.pkgPath,
                    env: {
                        ...mapObject(input.env ?? {}, (key, value) => [`TF_VAR_${key}`, value]),
                        ...input.env,
                        ...mapObject(input.parameters ?? {}, (key, value) => [`TF_VAR_${key}`, value])
                    }
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
        const terraform = await this.getTerraformBinary()
        try {
            runShell(
                terraform,
                ['init'],
                {
                    directory: input.pkgPath,
                    env: {
                        ...mapObject(input.env ?? {}, (key, value) => [`TF_VAR_${key}`, value]),
                        ...input.env,
                        ...mapObject(input.parameters ?? {}, (key, value) => [`TF_VAR_${key}`, value])
                    }
                }
            )
            const env = await this.getEnv(input.pkgPath)
            runShell(
                terraform,
                ['destroy', '-auto-approve'],
                {
                    directory: input.pkgPath,
                    env: {
                        ...mapObject(input.env ?? {}, (key, value) => [`TF_VAR_${key}`, value]),
                        ...input.env,
                        ...mapObject(input.parameters ?? {}, (key, value) => [`TF_VAR_${key}`, value])
                    }
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

    private async downloadTerraform(): Promise<boolean> {
        const TERRAFORM_DOWNLOAD_URLS = new Map<string, string>([
            ['darwin_arm64', 'https://releases.hashicorp.com/terraform/1.5.7/terraform_1.5.7_darwin_arm64.zip'],
            ['darwin_x64', 'https://releases.hashicorp.com/terraform/1.5.7/terraform_1.5.7_darwin_amd64.zip'],
            ['freebsd_arm', 'https://releases.hashicorp.com/terraform/1.5.7/terraform_1.5.7_freebsd_arm.zip'],
            ['freebsd_ia32', 'https://releases.hashicorp.com/terraform/1.5.7/terraform_1.5.7_freebsd_386.zip'],
            ['freebsd_x64', 'https://releases.hashicorp.com/terraform/1.5.7/terraform_1.5.7_freebsd_amd64.zip'],
            ['linux_arm', 'https://releases.hashicorp.com/terraform/1.5.7/terraform_1.5.7_linux_arm.zip'],
            ['linux_arm64', 'https://releases.hashicorp.com/terraform/1.5.7/terraform_1.5.7_linux_arm64.zip'],
            ['linux_ia32', 'https://releases.hashicorp.com/terraform/1.5.7/terraform_1.5.7_linux_386.zip'],
            ['linux_x64', 'https://releases.hashicorp.com/terraform/1.5.7/terraform_1.5.7_linux_amd64.zip'],
            ['openbsd_ia32', 'https://releases.hashicorp.com/terraform/1.5.7/terraform_1.5.7_openbsd_386.zip'],
            ['openbsd_x64', 'https://releases.hashicorp.com/terraform/1.5.7/terraform_1.5.7_openbsd_amd64.zip'],
            ['sunos_x64', 'https://releases.hashicorp.com/terraform/1.5.7/terraform_1.5.7_solaris_amd64.zip'],
            ['win32_ia32', 'https://releases.hashicorp.com/terraform/1.5.7/terraform_1.5.7_windows_386.zip'],
            ['win32_x64', 'https://releases.hashicorp.com/terraform/1.5.7/terraform_1.5.7_windows_amd64.zip'],
        ])

        const tfPath = this.terraformBinPath()


        try {
            await fs.promises.access(tfPath, fs.constants.X_OK)
            return false
        } catch (error: any) {
            // file does not exist or is corrupted - continue
            if (error.code !== 'ENOENT') {
                await fs.promises.rm(tfPath)
            }
        }

        console.log('Downloading terraform...')

        const binKey = `${os.platform()}_${os.arch()}`
        const url = TERRAFORM_DOWNLOAD_URLS.get(binKey)

        if (!url) {
            throw new Error('unsupported platform for terraform')
        }

        try {
            await fs.promises.mkdir(path.dirname(tfPath), { recursive: true })
        } catch (error: any) {
            if (error.code !== 'EEXIST') {
                throw new Error(`could not download terraform: ${error}`)
            }
        }

        await new Promise((resolve, reject) => {
            https.get(url, async response => {
                try {
                    await pipeline(response, decompress({ path: path.dirname(tfPath) }))
                    await fs.promises.chmod(tfPath, '0755')
                } catch (error) {
                    throw new Error(`could not download terraform: ${error}`)
                }

                resolve(null)
            }).on('error', error => reject(error))
        })

        return true

    }

    private async getEnv(pkgPath: string): Promise<{ [k: string]: string }> {
        const terraform = await this.getTerraformBinary()
        const resourceOut = runShell(
            terraform,
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

    private async getTerraformBinary(): Promise<string> {
        await this.downloadTerraform()
        return this.terraformBinPath()
    }

    private terraformBinPath() {
        return path.join(os.homedir(), '.hereya', 'iac', 'terraform', os.platform() === 'win32' ? 'terraform.exe' : 'terraform')
    }

}
