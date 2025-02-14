import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os'
import path from 'node:path'
import * as sinon from 'sinon'

describe('workspace:delete', () => {
    let homeDir: string;

    beforeEach(async () => {
        homeDir = path.join(os.tmpdir(), 'hereya-test-workspace-delete', randomUUID())
        sinon.stub(os, 'homedir').returns(homeDir)
        await fs.mkdir(homeDir, { recursive: true })
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

    afterEach(async () => {
        await fs.rm(homeDir, { force: true, recursive: true })
        sinon.restore()
    })

    it('succeeds if the workspace does not exist', async () => {
        const { stdout } = await runCommand(['workspace:delete', 'not-existing'])
        expect(stdout).to.contain('Workspace not-existing does not exist')
    })

    it('fails if the workspace has packages', async () => {
        const { error } = await runCommand(['workspace:delete', 'my-dev'])
        expect(error?.oclif?.exit).to.equal(2)
    })

    it('fails if workspace content is invalid', async () => {
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'my-dev.yaml'),
            'Invalid yaml\nblablablklkdnlkd\n'
        )
        const { error } = await runCommand(['workspace:delete', 'my-dev'])
        expect(error?.oclif?.exit).to.equal(2)
    })

    it('deletes the workspace', async () => {
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'ready.yaml'),
            `
            name: ready
            id: ready
            packages: {}
            `
        )
        const { stdout } = await runCommand(['workspace:delete', 'ready'])
        expect(stdout).to.contain('Workspace ready deleted successfully')
        const workspacePath = path.join(homeDir, '.hereya', 'state', 'workspaces', 'ready.yaml')
        expect(await fs.access(workspacePath).then(() => true).catch(() => false)).to.be.false
    })

})
