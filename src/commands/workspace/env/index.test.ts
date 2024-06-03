import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sinon from 'sinon';

describe('workspace:env', () => {
    let homeDir: string;

    beforeEach(async () => {
        homeDir = path.join(os.tmpdir(), 'hereya-test-workspace-env', randomUUID())
        sinon.stub(os, 'homedir').returns(homeDir)
        await fs.mkdir(homeDir, { recursive: true })
        await fs.mkdir(path.join(homeDir, '.hereya', 'state', 'workspaces'), { recursive: true })
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'test-workspace.yaml'),
            `
        id: test-workspace
        name: test-workspace
        env:
          MY_ENV_VAR: local:my-value
          ANOTHER_ENV_VAR: local:another-value
        packages: 
          cloudy/docker_postgres:
            version: ''
        `
        )
    })

    afterEach(async () => {
        await fs.rm(homeDir, { force: true, recursive: true })
        sinon.restore()
    })

    it('fails if the workspace does not exist', async () => {
        const { error } = await runCommand(['workspace:env', '-w', 'wrong-workspace'])
        expect(error?.oclif?.exit).to.equal(2)
    })

    it('prints the workspace env vars', async () => {
        const { stdout } = await runCommand(['workspace:env', '-w', 'test-workspace'])
        expect(stdout).to.contain('MY_ENV_VAR=my-value')
        expect(stdout).to.contain('ANOTHER_ENV_VAR=another-value')
    })

})
