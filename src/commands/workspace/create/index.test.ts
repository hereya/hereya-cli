import { runCommand } from '@oclif/test'
import { expect } from 'chai'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import * as sinon from 'sinon'

describe('workspace:create', () => {
    let homeDir: string;

    beforeEach(async () => {
        homeDir = path.join(os.tmpdir(), 'hereya-test-workspace-create', randomUUID())
        sinon.stub(os, 'homedir').returns(homeDir)
        await fs.mkdir(homeDir, { recursive: true })
    })

    afterEach(async () => {
        await fs.rm(homeDir, { force: true, recursive: true })
        sinon.restore()
    })


    it('creates a new workspace file', async () => {
        const { stdout } = await runCommand(['workspace:create', 'my-dev-workspace'])
        expect(stdout).to.contain('Workspace my-dev-workspace created successfully!')
        const workspaceContent = await fs.readFile(path.join(homeDir, '.hereya', 'state', 'workspaces', 'my-dev-workspace.yaml'), 'utf8')
        expect(workspaceContent).to.contain('name: my-dev-workspace')
    })

    it('does not create a workspace if it already exists', async () => {
        await fs.mkdir(path.join(homeDir, '.hereya', 'state', 'workspaces'), { recursive: true })
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'my-dev-workspace.yaml'),
            'name: my-dev-workspace\nid: my-dev-workspace\n'
        )
        const { stderr } = await runCommand(['workspace:create', 'my-dev-workspace'])
        expect(stderr).to.contain('Workspace my-dev-workspace already exists')
    })

    it('fails if workspace cannot be created', async () => {
        await fs.mkdir(path.join(homeDir, '.hereya', 'state', 'workspaces'), { recursive: true })
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'wrong.yaml'),
            'Invalid yaml\nblablablklkdnlkd\n'
        )
        const { error } = await runCommand(['workspace:create', 'wrong'])
        expect(error?.oclif?.exit).to.equal(2)
    });
})
