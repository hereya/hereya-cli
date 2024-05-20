import { expect, test } from '@oclif/test'
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sinon, { SinonStub } from 'sinon';

import { localInfrastructure } from '../../infrastructure/index.js';
import { packageManager } from '../../lib/package/index.js';

describe('up', () => {
    const homeDir = path.join(os.tmpdir(), 'hereya-test-install', randomUUID())

    const setupTest = test
    .do(async () => {
        await fs.mkdir(path.join(homeDir, '.hereya', 'state', 'workspaces'), { recursive: true })
    })
    .add('rootDir', path.join(os.tmpdir(), 'hereya-test', randomUUID()))
    .stub(os, 'homedir', stub => stub.returns(homeDir))
    .do(async (ctx) => {
        await fs.mkdir(ctx.rootDir, { recursive: true })
        process.env.HEREYA_PROJECT_ROOT_DIR = ctx.rootDir

        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'my-workspace.yaml'),
            'name: my-workspace\nid: my-workspace\n'
        )
    })
    .do(async (ctx) => {
        await fs.writeFile(
            path.join(ctx.rootDir, 'hereya.yaml'),
            `
            project: test-project
            workspace: my-workspace
            packages:
              cloudy/docker_postgres:
                version: ''
              another/package:
                version: ''
            `
        )
    })
    .stub(packageManager, 'getRepoContent', stub => stub.resolves({
        content:
            `
            iac: terraform
            infra: local
            `,
        found: true,
    }))
    .stub(localInfrastructure, 'provision', stub => stub.resolves({
        env: {},
        success: true
    }))
    .stub(localInfrastructure, 'destroy', stub => stub.resolves({
        success: true
    }))
    .stderr()
    .stdout()
    .finally(async (ctx) => {
        await fs.rm(ctx.rootDir, { force: true, recursive: true })
        await fs.rm(homeDir, { force: true, recursive: true })
    })

    setupTest
    .do(async (ctx) => {
        await fs.rm(path.join(ctx.rootDir, 'hereya.yaml'))
    })
    .command(['up'])
    .it('fails if the project is not initialized', async ctx => {
        expect(ctx.stderr).to.contain(`Project not initialized. Run 'hereya init' first.`)
    })

    setupTest
    .command(['up'])
    .it('provisions all packages in the project', async () => {
        sinon.assert.calledTwice(localInfrastructure.provision as SinonStub)
        sinon.assert.calledWithMatch(
            localInfrastructure.provision as SinonStub,
            sinon.match.has('pkgName', 'cloudy/docker_postgres')
        )
        sinon.assert.calledWithMatch(
            localInfrastructure.provision as SinonStub,
            sinon.match.has('pkgName', 'another/package')
        )
        sinon.assert.calledWithMatch(
            localInfrastructure.provision as SinonStub,
            sinon.match.has('workspace', 'my-workspace')
        )
    })

    setupTest
    .do(async () => {
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'another-workspace.yaml'),
            'name: another-workspace\nid: another-workspace\n'
        )
    })
    .command(['up', '--workspace', 'another-workspace'])
    .it('provisions all packages in the project for the specified workspace', async () => {
        sinon.assert.calledTwice(localInfrastructure.provision as SinonStub)
        sinon.assert.calledWithMatch(
            localInfrastructure.provision as SinonStub,
            sinon.match.has('workspace', 'another-workspace')
        )
    })

    setupTest
    .do(async () => {
        await fs.mkdir(path.join(homeDir, '.hereya', 'state', 'projects'), { recursive: true })
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'projects', 'test-project.yaml'),
            `
            project: test-project
            packages:
              cloudy/docker_postgres:
                version: ''
              removed/package:
                version: ''
              another/package:
                version: ''
            `
        )
    })
    .command(['up'])
    .it('destroys removed packages', async () => {
        sinon.assert.calledTwice(localInfrastructure.provision as SinonStub)
        sinon.assert.calledOnce(localInfrastructure.destroy as SinonStub)
        sinon.assert.calledWithMatch(
            localInfrastructure.destroy as SinonStub,
            sinon.match.has('pkgName', 'removed/package')
        )
    })

    setupTest
    .do(async () => {
        await fs.mkdir(path.join(homeDir, '.hereya', 'state', 'projects'), { recursive: true })
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'projects', 'test-project.yaml'),
            `
            project: test-project
            packages:
              cloudy/docker_postgres:
                version: ''
              removed/package:
                version: ''
              another/package:
                version: ''
            `
        )
    })
    .command(['up'])
    .it('updates the project state file', async () => {
        const projectState = await fs.readFile(path.join(homeDir, '.hereya', 'state', 'projects', 'test-project.yaml'), { encoding: 'utf8' })
        expect(projectState).to.contain('cloudy/docker_postgres')
        expect(projectState).to.contain('another/package')
        expect(projectState).not.to.contain('removed/package')
    })

})
