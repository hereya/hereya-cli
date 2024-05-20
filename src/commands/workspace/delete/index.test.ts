import { expect, test } from '@oclif/test'
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

describe('workspace:delete', () => {
    const homeDir = path.join(os.tmpdir(), 'hereya-test-workspace-delete', randomUUID())

    const setupTest = test
    .stdout()
    .stderr()
    .stub(os, 'homedir', stub => stub.returns(homeDir))
    .do(async () => {
        await fs.mkdir(homeDir, { recursive: true })
    })
    .do(async () => {
        await fs.mkdir(path.join(homeDir, '.hereya', 'state', 'workspaces'), { recursive: true })
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'my-dev.yaml'),
            `
            name: my-dev
            id: my-dev
            packages:
               hereya/is-awesome:
                  version: ''
               and/so-is-oclif:
                  version: ''
            `
        )
    })
    .finally(async () => {
        await fs.rm(homeDir, { force: true, recursive: true })
    })

    setupTest
    .command(['workspace:delete', 'not-existing'])
    .it('succeeds if the workspace does not exist', async ctx => {
        expect(ctx.stdout).to.contain('Workspace not-existing does not exist')
    })

    setupTest
    .command(['workspace:delete', 'my-dev'])
    .exit(2)
    .it('fails if the workspace has packages')

    setupTest
    .do(async () => {
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'my-dev.yaml'),
            'Invalid yaml\nblablablklkdnlkd\n'
        )
    })
    .command(['workspace:delete', 'my-dev'])
    .exit(2)
    .it('fails if workspace content is invalid')

    setupTest
    .do(async () => {
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'ready.yaml'),
            `
            name: ready
            id: ready
            packages: {}
            `
        )
    })
    .command(['workspace:delete', 'ready'])
    .it('deletes the workspace', async ctx => {
        expect(ctx.stdout).to.contain('Workspace ready deleted successfully')
        const workspacePath = path.join(homeDir, '.hereya', 'state', 'workspaces', 'ready.yaml')
        expect(await fs.access(workspacePath).then(() => true).catch(() => false)).to.be.false
    })
})
