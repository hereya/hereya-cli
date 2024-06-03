import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sinon, { SinonStub } from 'sinon';

import { localBackend } from '../../backend/index.js';
import { localInfrastructure } from '../../infrastructure/index.js';
import { packageManager } from '../../lib/package/index.js';

describe('remove', () => {
    let homeDir: string
    let rootDir: string

    beforeEach(async () => {
        homeDir = path.join(os.tmpdir(), 'hereya-test-add', randomUUID())
        sinon.stub(os, 'homedir').returns(homeDir)
        await fs.mkdir(path.join(homeDir, '.hereya', 'state', 'workspaces'), { recursive: true })

        rootDir = path.join(os.tmpdir(), 'hereya-test-remove', randomUUID())
        await fs.mkdir(rootDir, { recursive: true })
        process.env.HEREYA_PROJECT_ROOT_DIR = rootDir

        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'test-workspace.yaml'),
            'name: test-workspace\nid: test-workspace\n'
        )
    });

    afterEach(async () => {
        sinon.restore()
        await fs.rm(rootDir, { force: true, recursive: true })
        await fs.rm(homeDir, { force: true, recursive: true })
    });

    it('does not work on uninitialized projects', async () => {
        const { stderr } = await runCommand(['remove', 'cloudy/docker_postgres'])
        expect(stderr).to.contain(`Project not initialized. Run 'hereya init' first.`)
    })

    it('does nothing if the package is not in the project', async () => {
        await fs.writeFile(path.join(rootDir, 'hereya.yaml'), 'project: test-project\nworkspace: test-workspace\n')
        const { stderr } = await runCommand(['remove', 'notin/project'])
        expect(stderr).to.contain('Package notin/project not found in project')
    })

    it('fails if the package cannot be resolved', async () => {
        await fs.writeFile(
            path.join(rootDir, 'hereya.yaml'),
            `
              project: test-project
              workspace: test-workspace
              packages:
                not/exist:
                    version: ''
            `
        )
        sinon.stub(packageManager, 'getRepoContent').resolves({ found: false, reason: 'not found' })
        const { error } = await runCommand(['remove', 'not/exist'])
        expect(error?.oclif?.exit).to.equal(2)
    })

    it('fails for invalid infra', async () => {
        await fs.writeFile(
            path.join(rootDir, 'hereya.yaml'),
            `
              project: test-project
              workspace: test-workspace
              packages:
                wrong/infra:
                    version: ''
            `
        )
        sinon.stub(packageManager, 'getRepoContent').resolves({
            content: `
            iac: terraform
            infra: invalid
            `,
            found: true,
        })
        const { error } = await runCommand(['remove', 'wrong/infra'])
        expect(error?.oclif?.exit).to.equal(2)
    })

    it('fails for infra is not supported yet', async () => {
        await fs.writeFile(
            path.join(rootDir, 'hereya.yaml'),
            `
              project: test-project
              workspace: test-workspace
              packages:
                unsupported/infra:
                    version: ''
            `
        )
        sinon.stub(packageManager, 'getRepoContent').resolves({
            content: `
            iac: cdk
            infra: not-supported
            `,
            found: true,
        })
        const { error } = await runCommand(['remove', 'unsupported/infra'])
        expect(error?.oclif?.exit).to.equal(2)
    })

    describe('with success', () => {
        beforeEach(async () => {
            await fs.writeFile(
                path.join(homeDir, '.hereya', 'state', 'workspaces', 'dev.yaml'),
                `
            name: dev
            id: dev
            env:
                NETWORK_ID: local:network
            packages:
               awesome/pkg:
                    version: ''
            `
            )
            await fs.writeFile(path.join(rootDir, 'hereya.yaml'),
                `
            project: test-project
            workspace: dev
            packages:
               cloudy/docker_postgres:
                   version: "1.0.0"
            deploy:
                cloudy/fake-deploy:
                     version: ""
            `
            )
            await fs.mkdir(path.join(rootDir, '.hereya'), { recursive: true })
            await fs.writeFile(path.join(rootDir, '.hereya', 'env.dev.yaml'),
                `
            FOO: local:BAR
            GIB: local:legendary
            AND: local:another
            `
            )
            await fs.mkdir(path.join(rootDir, 'hereyavars'), { recursive: true })
            await fs.writeFile(
                path.join(rootDir, 'hereyavars', 'cloudy-docker_postgres.yaml'),
                `
            myParam: myValue
            `
            )
            sinon.stub(localInfrastructure, 'destroy').resolves({
                env: { FOO: "BAR", GIB: "legendary" },
                success: true
            })
            sinon.stub(localBackend, 'saveState').resolves()
        })

        it('removes a package and its env variables from the project', async () => {
            sinon.stub(packageManager, 'getRepoContent').resolves({
                content:
                    `
                iac: terraform
                infra: local
                `,
                found: true,
            })
            await runCommand(['remove', 'cloudy/docker_postgres'])
            const envFile = await fs.readFile(path.join(rootDir, '.hereya', 'env.dev.yaml'), 'utf8')
            expect(envFile).to.not.contain('FOO: local:BAR')
            expect(envFile).to.not.contain('GIB: local:legendary')
            expect(envFile).to.contain('AND: local:another')
            const hereyaYaml = await fs.readFile(path.join(rootDir, 'hereya.yaml'), 'utf8')
            expect(hereyaYaml).to.not.contain('cloudy/docker_postgres')

            expect((localInfrastructure.destroy as SinonStub).calledWithMatch(sinon.match.has('parameters', { myParam: 'myValue' }))).to.be.true
        })

        it('skips un-deployment if the package is a deployment package', async () => {
            sinon.stub(packageManager, 'getRepoContent').resolves({
                content:
                    `
                iac: terraform
                infra: local
                deploy: true
                `,
                found: true,
            })
            await runCommand(['remove', 'cloudy/fake-deploy'])
            sinon.assert.notCalled(localInfrastructure.destroy as SinonStub)
        })

        it('removes a deployment package', async () => {
            sinon.stub(packageManager, 'getRepoContent').resolves({
                content:
                    `
                iac: terraform
                infra: local
                deploy: true
                `,
                found: true,
            })
            await runCommand(['remove', 'cloudy/fake-deploy'])
            const hereyaYaml = await fs.readFile(path.join(rootDir, 'hereya.yaml'), 'utf8')
            expect(hereyaYaml).to.not.contain('cloudy/fake-deploy')
        })
    })
})
