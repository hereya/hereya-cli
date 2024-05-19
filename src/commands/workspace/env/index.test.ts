import { expect, test } from '@oclif/test'
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

describe('workspace:env', () => {
    const homeDir = path.join(os.tmpdir(), 'hereya-test-workspace-env', randomUUID())

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
    .finally(async () => {
        await fs.rm(homeDir, { force: true, recursive: true })
    })

    setupTest
    .command(['workspace:env', '-w', 'wrong-workspace'])
    .exit(2)
    .it('fails if the workspace does not exist')

    setupTest
    .command(['workspace:env', '-w', 'test-workspace'])
    .it('prints the workspace env vars', ctx => {
        expect(ctx.stdout).to.contain('MY_ENV_VAR=my-value')
        expect(ctx.stdout).to.contain('ANOTHER_ENV_VAR=another-value')
    })
})
