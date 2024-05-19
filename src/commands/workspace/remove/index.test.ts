import { expect, test } from '@oclif/test'
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { localInfrastructure } from '../../../infrastructure/index.js';
import { packageManager } from '../../../lib/package/index.js';

describe('workspace:remove', () => {
    const homeDir = path.join(os.tmpdir(), 'hereya-test-workspace-remove', randomUUID())

    const setupTest = test
    .stdout()
    .stderr()
    .stub(os, 'homedir', stub => stub.returns(homeDir))
    .do(async () => {
        await fs.mkdir(homeDir, { recursive: true })
        await fs.mkdir(path.join(homeDir, '.hereya', 'state', 'workspaces'), { recursive: true })
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'test-workspace.yaml'),
            `
        name: test-workspace
        id: test-workspace
        env:
          FOO: BAR
          GIB: legendary
        packages:
          cloud/postgres:
            version: ''
          another/package:
            version: ''
        `
        )
    })
    .finally(async () => {
        await fs.rm(homeDir, { force: true, recursive: true })
    })

    const setupTestWithDestroyStub = setupTest
    .stub(localInfrastructure, 'destroy', stub => stub.resolves({
        env: { FOO: "BAR", GIB: "legendary" },
        success: true
    }))

    setupTestWithDestroyStub
    .command(['workspace:remove', 'cloud/postgres', '-w', 'wrong-workspace'])
    .exit(2)
    .it('fails if the workspace does not exist')

    setupTestWithDestroyStub
    .command(['workspace:remove', 'notin/workspace', '-w', 'test-workspace'])
    .it('does nothing if the package is not in the workspace', async (ctx) => {
        expect(ctx.stdout).to.contain('Package notin/workspace not found in workspace test-workspace')
    })

    setupTestWithDestroyStub
    .stub(packageManager, 'getRepoContent', stub => stub.resolves({ found: false, reason: 'not found' }))
    .command(['workspace:remove', 'cloud/postgres', '-w', 'test-workspace'])
    .exit(2)
    .it('fails if the package cannot be resolved')

    setupTestWithDestroyStub
    .stub(packageManager, 'getRepoContent', stub => stub.resolves({
        content: `
        iac: cdk
        infra: invalid
        `,
        found: true,
    }))
    .command(['workspace:remove', 'cloud/postgres', '-w', 'test-workspace'])
    .exit(2)
    .it('fails for invalid infra')

    setupTest
    .stub(packageManager, 'getRepoContent', stub => stub.resolves({
        content: `
        iac: terraform
        infra: local
        `,
        found: true,
    }))
    .stub(localInfrastructure, 'destroy', stub => stub.resolves({
        env: { FOO: "BAR" },
        success: true
    }))
    .command(['workspace:remove', 'cloud/postgres', '-w', 'test-workspace'])
    .it('removes a package and its env from a workspace', async (ctx) => {
        expect(ctx.stdout).to.contain('Package cloud/postgres removed from workspace test-workspace')
        const workspaceContent = await fs.readFile(path.join(homeDir, '.hereya', 'state', 'workspaces', 'test-workspace.yaml'), 'utf8')
        expect(workspaceContent).to.not.contain('cloud/postgres')
        expect(workspaceContent).to.not.contain('FOO: BAR')
        expect(workspaceContent).to.contain('GIB: legendary')
        expect(workspaceContent).to.contain('another/package')
    })


})
