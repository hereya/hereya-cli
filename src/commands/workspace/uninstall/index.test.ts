import { runCommand } from '@oclif/test'
import { expect } from 'chai'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import * as sinon from 'sinon'
import { SinonStub } from 'sinon'

import { localInfrastructure } from '../../../infrastructure/index.js';
import { packageManager } from '../../../lib/package/index.js';

describe('workspace:uninstall', () => {
    let homeDir: string;

    beforeEach(async () => {
        homeDir = path.join(os.tmpdir(), 'hereya-test-workspace-uninstall', randomUUID())
        sinon.stub(os, 'homedir').returns(homeDir)
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

    afterEach(async () => {
        await fs.rm(homeDir, { force: true, recursive: true })
        sinon.restore()
    })

    describe('with error', async () => {
        beforeEach(async () => {
            sinon.stub(localInfrastructure, 'destroy').resolves({
                env: { FOO: "BAR", GIB: "legendary" },
                success: true
            })
        })

        it('fails if the workspace does not exist', async () => {
            const { error } = await runCommand(['workspace:uninstall', 'cloud/postgres', '-w', 'wrong-workspace'])
            expect(error?.oclif?.exit).to.equal(2)
        })

        it('does nothing if the package is not in the workspace', async () => {
            const { stdout } = await runCommand(['workspace:uninstall', 'notin/workspace', '-w', 'test-workspace'])
            expect(stdout).to.contain('Package notin/workspace not found in workspace test-workspace')
        })

        it('fails if the package cannot be resolved', async () => {
            sinon.stub(packageManager, 'getRepoContent').resolves({ found: false, reason: 'not found' })
            const { error } = await runCommand(['workspace:uninstall', 'cloud/postgres', '-w', 'test-workspace'])
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
            const { error } = await runCommand(['workspace:uninstall', 'cloud/postgres', '-w', 'test-workspace'])
            expect(error?.oclif?.exit).to.equal(2)

        })
    })

    describe('with success', async () => {
        beforeEach(async () => {
            sinon.stub(packageManager, 'getRepoContent').resolves({
                content: `
                iac: terraform
                infra: local
                `,
                found: true,
                pkgUrl: 'https://github.com/org/myPkg',
            })
            sinon.stub(localInfrastructure, 'destroy').resolves({
                env: { FOO: "BAR" },
                success: true
            })
        })

        it('removes a package and its env from a workspace', async () => {
            const { stdout } = await runCommand(['workspace:uninstall', 'cloud/postgres', '-w', 'test-workspace'])
            expect(stdout).to.contain('Package cloud/postgres uninstalled successfully from workspace test-workspace')
            const workspaceContent = await fs.readFile(path.join(homeDir, '.hereya', 'state', 'workspaces', 'test-workspace.yaml'), 'utf8')
            expect(workspaceContent).to.not.contain('cloud/postgres')
            expect(workspaceContent).to.not.contain('FOO: BAR')
            expect(workspaceContent).to.contain('GIB: legendary')
            expect(workspaceContent).to.contain('another/package')
        })

        it('should use saved parameters at package creation', async () => {
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
                parameters:
                   network: vpc-123
                   port: 5442
              another/package:
                version: ''
            `
            )
            await runCommand(['workspace:uninstall', 'cloud/postgres', '-w', 'test-workspace'])
            sinon.assert.calledWithMatch((localInfrastructure.destroy as SinonStub), sinon.match.has('parameters', {
                network: 'vpc-123',
                port: 5442
            }))
        });

        it('should use user specified parameters', async () => {
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
                parameters:
                   network: vpc-123
                   port: 5442
                   keep: true
              another/package:
                version: ''
            `
            )
            await fs.writeFile(
                path.join(homeDir, 'my-params.yaml'),
                `
                network: vpc-456
                port: 5443
                `
            )
            await runCommand(['workspace:uninstall', 'cloud/postgres', '-w', 'test-workspace', '-p', 'network=vpc-789', '-f', `${homeDir}/my-params.yaml`])
            sinon.assert.calledWithMatch((localInfrastructure.destroy as SinonStub), sinon.match.has('parameters', {
                keep: true,
                network: 'vpc-789',
                port: 5443
            }))
        });
    })

})
