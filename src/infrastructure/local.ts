import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { simpleGit } from 'simple-git';

import { getIac } from '../iac/index.js';
import {
    DeployInput,
    DeployOutput,
    Infrastructure,
    ProvisionInput,
    ProvisionOutput,
    SaveEnvInput,
    SaveEnvOutput,
    UndeployInput,
    UndeployOutput
} from './common.js';

export class LocalInfrastructure implements Infrastructure {

    async bootstrap() {
        console.log('Bootstrapping local infrastructure');
    }

    async deploy(input: DeployInput): Promise<DeployOutput> {
        input.parameters = {
            ...input.parameters,
            hereyaProjectEnv: JSON.stringify(input.projectEnv ?? {}),
            hereyaProjectRootDir: input.projectRootDir
        }
        return this.provision(input);
    }

    async destroy(input: ProvisionInput): Promise<ProvisionOutput> {
        // noinspection DuplicatedCode
        const destPath = path.join(os.homedir(), '.hereya', input.id, input.canonicalName);
        const downloadPath = await this.download(input.pkgUrl, destPath);
        const iac$ = getIac({ type: input.iacType });
        if (!iac$.supported) {
            return { reason: iac$.reason, success: false };
        }

        const { iac } = iac$;
        const output = await iac.destroy({
            env: input.env ?? {},
            id: input.id,
            parameters: input.parameters,
            pkgPath: downloadPath
        });
        if (!output.success) {
            return { reason: output.reason, success: false };
        }

        // Remove downloaded package
        await fs.rm(downloadPath, { recursive: true });

        return { env: output.env, success: true };
    }

    async provision(input: ProvisionInput): Promise<ProvisionOutput> {
        // noinspection DuplicatedCode
        const destPath = path.join(os.homedir(), '.hereya', input.id, input.canonicalName);
        const downloadPath = await this.download(input.pkgUrl, destPath);
        const iac$ = getIac({ type: input.iacType });
        if (!iac$.supported) {
            return { reason: iac$.reason, success: false };
        }

        const { iac } = iac$;
        const output = await iac.apply({
            env: input.env ?? {},
            id: input.id,
            parameters: input.parameters,
            pkgPath: downloadPath
        });
        if (!output.success) {
            return { reason: output.reason, success: false };
        }

        return { env: output.env, success: true };
    }

    async resolveEnv(input: { value: string }) {
        return { value: input.value };
    }

    async saveEnv(input: SaveEnvInput): Promise<SaveEnvOutput> {
        console.log(`Saving env to ${input.id}`);
        return { success: true };
    }

    async undeploy(input: UndeployInput): Promise<UndeployOutput> {
        input.parameters = {
            ...input.parameters,
            projectEnv: JSON.stringify(input.projectEnv ?? {}),
            projectRootDir: input.projectRootDir
        }
        return this.destroy(input);
    }

    private async download(pkgUrl: string, destPath: string) {
        if (await this.isNotEmpty(destPath)) {
            console.log(`Package already downloaded at ${destPath}`);
            return destPath;
        }

        await fs.mkdir(destPath, { recursive: true })
        console.log(`Downloading package from ${pkgUrl}`);

        // Initialize simple-git
        const git = simpleGit()

        // Clone repository into temp directory
        await git.clone(pkgUrl, destPath, ['--depth=1'])
        return destPath
    }

    private async isNotEmpty(directoryPath: string) {
        try {
            const files = await fs.readdir(directoryPath);
            return files.length > 0;
        } catch {
            return false; // or you can handle the error as needed
        }
    }
}
