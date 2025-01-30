import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sinon, { SinonStub } from 'sinon';

import { localInfrastructure } from '../../../infrastructure/index.js';
import { packageManager } from '../../../lib/package/index.js';
import { load } from '../../../lib/yaml-utils.js';

describe('workspace:install', () => {
    let homeDir: string;

    beforeEach(async () => {
        homeDir = path.join(os.tmpdir(), 'hereya-test-workspace-install', randomUUID())
        sinon.stub(os, 'homedir').returns(homeDir)
        await fs.mkdir(homeDir, { recursive: true })
        await fs.mkdir(path.join(homeDir, '.hereya', 'state', 'workspaces'), { recursive: true })
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'test-workspace.yaml'),
            'name: test-workspace\nid: test-workspace\n'
        )
    })

    afterEach(async () => {
        await fs.rm(homeDir, { force: true, recursive: true })
        sinon.restore()
    })

    describe('with error', () => {
        beforeEach(async () => {
            sinon.stub(localInfrastructure, 'provision').resolves({
                env: { FOO: "BAR", GIB: "legendary" },
                success: true
            })
        })

        it('fails if the package cannot be resolved', async () => {
            sinon.stub(packageManager, 'getRepoContent').resolves({ found: false, reason: 'not found' })
            const { error } = await runCommand(['workspace:install', 'cloudy/docker_postgres', '-w', 'test-workspace'])
            expect(error?.oclif?.exit).to.equal(2)
        })

        it('fails for invalid infra', async () => {
            sinon.stub(packageManager, 'getRepoContent').resolves({
                content: `
                iac: cdk
                infra: invalid
                `,
                found: true,
                pkgUrl: 'https://github.com/org/myPkg',
            })
            const { error } = await runCommand(['workspace:install', 'wrong/infra', '-w', 'test-workspace'])
            expect(error?.oclif?.exit).to.equal(2)
        })

        it('fails if the workspace cannot be found', async () => {
            sinon.stub(packageManager, 'getRepoContent').resolves({
                content: `
                iac: terraform
                infra: local
                `,
                found: true,
                pkgUrl: 'https://github.com/org/myPkg',
            })
            await fs.rm(path.join(homeDir, '.hereya', 'state', 'workspaces'), { force: true, recursive: true })
            const { error } = await runCommand(['workspace:install', 'workspace/notfound', '-w', 'notfound'])
            expect(error?.oclif?.exit).to.equal(2)
        })
    })

    describe('with success', async () => {
        beforeEach(async () => {
            sinon.stub(packageManager, 'getRepoContent').resolves({
                content: `
            iac: cdk
            infra: local
            `,
                found: true,
                pkgUrl: 'https://github.com/org/myPkg',
            })
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
            sinon.stub(localInfrastructure, 'provision').resolves({
                env: { ANOTHER_ENV: "legendary", NEW_ENV: "new-var" },
                success: true
            })
        })

        it('adds a package to the workspace and saves exported env to workspace', async () => {
            const { stdout } = await runCommand(['workspace:install', 'mynew/package', '-w', 'my-dev'])
            expect(stdout).to.contain('Package mynew/package installed successfully into workspace my-dev')
            const workspaceContent = await fs.readFile(path.join(homeDir, '.hereya', 'state', 'workspaces', 'my-dev.yaml'), 'utf8')
            expect(workspaceContent).to.contain('mynew/package')
            expect(workspaceContent).to.contain('NEW_ENV: local:new-var')
            expect(workspaceContent).to.contain('ANOTHER_ENV: local:legendary')
            expect(workspaceContent).to.contain('EXISTING: aws:env_var')
        })

        it('uses and saves user specified parameters', async () => {
            await runCommand(['workspace:install', 'mynew/package', '-w', 'my-dev', '-p', 'PARAM=VALUE', '-p', 'ANOTHER=VALUE'])
            expect((localInfrastructure.provision as SinonStub).calledWithMatch(
                sinon.match.has('parameters', { ANOTHER: 'VALUE', PARAM: 'VALUE' })
            )).to.be.true
            const { data: workspaceContent } = await load<any>(path.join(homeDir, '.hereya', 'state', 'workspaces', 'my-dev.yaml'))
            expect(workspaceContent.packages['mynew/package'].parameters).to.deep.equal({
                ANOTHER: 'VALUE',
                PARAM: 'VALUE'
            })
        })

        it('uses parameters from file', async () => {
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
            await runCommand(['workspace:install', 'mynew/package', '-w', 'my-dev', '-p', 'ipVersion=6', '-f', `${homeDir}/my-params.yaml`])
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

})
