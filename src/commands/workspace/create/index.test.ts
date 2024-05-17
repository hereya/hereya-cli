import { expect, test } from '@oclif/test'
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

describe('workspace:create', () => {
    const homeDir = path.join(os.tmpdir(), 'hereya-test-workspace-create', randomUUID())

    const setupTest = test
    .stdout()
    .stderr()
    .stub(os, 'homedir', stub => stub.returns(homeDir))
    .do(async () => {
        await fs.mkdir(homeDir, { recursive: true })
    })
    .finally(async () => {
        await fs.rm(homeDir, { force: true, recursive: true })
    })

    setupTest
    .command(['workspace:create', 'my-dev-workspace'])
    .it('creates a new workspace file', async ctx => {
        expect(ctx.stdout).to.contain('Workspace my-dev-workspace created successfully!')
        const workspaceContent = await fs.readFile(path.join(homeDir, '.hereya', 'state', 'workspaces', 'my-dev-workspace.yaml'), 'utf8')
        expect(workspaceContent).to.contain('name: my-dev-workspace')
    })

    setupTest
    .do(async () => {
        await fs.mkdir(path.join(homeDir, '.hereya', 'state', 'workspaces'), { recursive: true })
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'my-dev-workspace.yaml'),
            'name: my-dev-workspace\nid: my-dev-workspace\n'
        )
    })
    .command(['workspace:create', 'my-dev-workspace'])
    .it('does not create a workspace if it already exists', async ctx => {
        expect(ctx.stderr).to.contain('Workspace my-dev-workspace already exists')
    })

    setupTest
    .do(async () => {
        await fs.mkdir(path.join(homeDir, '.hereya', 'state', 'workspaces'), { recursive: true })
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'wrong.yaml'),
            'Invalid yaml\nblablablklkdnlkd\n'
        )
    })
    .command(['workspace:create', 'wrong'])
    .exit(2)
    .it('fails if workspace cannot be created')
})
