import { expect, test } from '@oclif/test'
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sinon, { SinonStub } from 'sinon';

import { localInfrastructure } from '../../../infrastructure/index.js';
import { packageManager } from '../../../lib/package/index.js';
import { load } from '../../../lib/yaml-utils.js';

describe('workspace:add', () => {
    const homeDir = path.join(os.tmpdir(), 'hereya-test-workspace-add', randomUUID())

    const setupTest = test
    .stdout()
    .stderr()
    .stub(os, 'homedir', stub => stub.returns(homeDir))
    .do(async () => {
        await fs.mkdir(homeDir, { recursive: true })
        await fs.mkdir(path.join(homeDir, '.hereya', 'state', 'workspaces'), { recursive: true })
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'test-workspace.yaml'),
            'name: test-workspace\nid: test-workspace\n'
        )
    })
    .finally(async () => {
        await fs.rm(homeDir, { force: true, recursive: true })
    })

    const setupTestWithProvisioningStub = setupTest
    .stub(localInfrastructure, 'provision', stub => stub.resolves({
        env: { FOO: "BAR", GIB: "legendary" },
        success: true
    }))

    setupTestWithProvisioningStub
    .stub(packageManager, 'getRepoContent', stub => stub.resolves({ found: false, reason: 'not found' }))
    .command(['workspace:add', 'cloudy/docker_postgres', '-w', 'test-workspace'])
    .exit(2)
    .it('fails if the package cannot be resolved')

    setupTestWithProvisioningStub
    .stub(packageManager, 'getRepoContent', stub => stub.resolves({
        content: `
        iac: cdk
        infra: invalid
        `,
        found: true,
    }))
    .command(['workspace:add', 'wrong/infra', '-w', 'test-workspace'])
    .exit(2)
    .it('fails for invalid infra')

    setupTestWithProvisioningStub
    .stub(packageManager, 'getRepoContent', stub => stub.resolves({
        content: `
        iac: terraform
        infra: local
        `,
        found: true,
    }))
    .do(async () => {
        await fs.rm(path.join(homeDir, '.hereya', 'state', 'workspaces'), { force: true, recursive: true })
    })
    .command(['workspace:add', 'workspace/notfound', '-w', 'notfound'])
    .exit(2)
    .it('fails if the workspace cannot be found')


    const setupSuccessTest = setupTest
    .stub(packageManager, 'getRepoContent', stub => stub.resolves({
        content: `
        iac: cdk
        infra: local
        `,
        found: true,
    }))
    .do(async () => {
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'my-dev.yaml'),
            `
            name: my-dev
            id: my-dev
            env:
                EXISTING: aws:env_var
            packages:
                existing/pkg:
                    version: '1.0.0'
            `
        )
    })
    .stub(localInfrastructure, 'provision', stub => stub.resolves({
        env: { ANOTHER_ENV: "legendary", NEW_ENV: "new-var" },
        success: true
    }))

    setupSuccessTest
    .command(['workspace:add', 'mynew/package', '-w', 'my-dev'])
    .it('adds a package to the workspace and saves exported env to workspace', async ctx => {
        expect(ctx.stdout).to.contain('Package mynew/package added to workspace my-dev')
        const workspaceContent = await fs.readFile(path.join(homeDir, '.hereya', 'state', 'workspaces', 'my-dev.yaml'), 'utf8')
        expect(workspaceContent).to.contain('mynew/package')
        expect(workspaceContent).to.contain('NEW_ENV: local:new-var')
        expect(workspaceContent).to.contain('ANOTHER_ENV: local:legendary')
        expect(workspaceContent).to.contain('EXISTING: aws:env_var')
    })

    setupSuccessTest
    .command(['workspace:add', 'mynew/package', '-w', 'my-dev', '-p', 'PARAM=VALUE', '-p', 'ANOTHER=VALUE'])
    .it('uses and saves user specified parameters', async () => {
        expect((localInfrastructure.provision as SinonStub).calledWithMatch(
            sinon.match.has('parameters', { ANOTHER: 'VALUE', PARAM: 'VALUE' })
        )).to.be.true
        const { data: workspaceContent } = await load<any>(path.join(homeDir, '.hereya', 'state', 'workspaces', 'my-dev.yaml'))
        expect(workspaceContent.packages['mynew/package'].parameters).to.deep.equal({
            ANOTHER: 'VALUE',
            PARAM: 'VALUE'
        })
    })

    setupSuccessTest
    .do(async () => {
        await fs.writeFile(
            path.join(homeDir, 'my-params.yaml'),
            `
          networkId: jupiter
          ipVersion: 4
          namespace:
            name: my-namespace
            id: my-namespace-id
          `
        )
    })
    .command(['workspace:add', 'mynew/package', '-w', 'my-dev', '-p', 'ipVersion=6', '-f', `${homeDir}/my-params.yaml`])
    .it('uses parameters from file', async () => {

        sinon.assert.calledWithMatch(localInfrastructure.provision as SinonStub,
            sinon.match.has('parameters', {
                ipVersion: '6',
                namespace: {
                    id: 'my-namespace-id',
                    name: 'my-namespace'
                },
                networkId: 'jupiter'
            })
        )
    })

})