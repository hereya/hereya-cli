import { Infrastructure, ProvisionInput, ProvisionOutput } from './common.js';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import { simpleGit } from 'simple-git';
import { getIac } from '../iac/index.js';

export class LocalInfrastructure implements Infrastructure {

    async bootstrap() {
        console.log('Bootstrapping local infrastructure');
    }

    async provision(input: ProvisionInput): Promise<ProvisionOutput> {
        const destPath = path.join(os.homedir(), '.hereya', input.project, input.workspace, input.pkgName.replace('/', '-'));
        const downloadPath = await this.download(input.pkgUrl, destPath);
        const iac$ = getIac({ type: input.iacType });
        if (!iac$.supported) {
            return { success: false, reason: iac$.reason };
        }
        const { iac } = iac$;
        const output = await iac.apply({ pkgPath: downloadPath, env: input.workspaceEnv });
        if (!output.success) {
            return { success: false, reason: output.reason };
        }

        return { success: true, env: output.env };
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
        } catch (error) {
            return false; // or you can handle the error as needed
        }
    }
}
