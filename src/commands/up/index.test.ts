import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sinon, { SinonStub } from 'sinon';

import { localInfrastructure } from '../../infrastructure/index.js';
import { envManager } from '../../lib/env/index.js';
import { packageManager } from '../../lib/package/index.js';

describe('up', () => {
    let homeDir: string
    let rootDir: string

    beforeEach(async () => {
        homeDir = path.join(os.tmpdir(), 'hereya-test-up', randomUUID())
        sinon.stub(os, 'homedir').returns(homeDir)
        await fs.mkdir(path.join(homeDir, '.hereya', 'state', 'workspaces'), { recursive: true })
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'my-workspace.yaml'),
            'name: my-workspace\nid: my-workspace\n'
        )

        rootDir = path.join(os.tmpdir(), 'hereya-test', randomUUID())
        await fs.mkdir(rootDir, { recursive: true })
        process.env.HEREYA_PROJECT_ROOT_DIR = rootDir
        await fs.writeFile(
            path.join(rootDir, 'hereya.yaml'),
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
        sinon.stub(packageManager, 'getRepoContent').resolves({
            content:
                `
                iac: terraform
                infra: local
                `,
            found: true,
            pkgUrl: 'https://github.com/cloudy/docker_postgres',
        })
        sinon.stub(localInfrastructure, 'provision').resolves({
            env: {},
            success: true
        })
        sinon.stub(localInfrastructure, 'destroy').resolves({
            env: {},
            success: true
        })
    });

    afterEach(async () => {
        sinon.restore()
        await fs.rm(rootDir, { force: true, recursive: true })
        await fs.rm(homeDir, { force: true, recursive: true })
    })

    it('fails if the project is not initialized', async () => {
        await fs.rm(path.join(rootDir, 'hereya.yaml'))
        const { stdout } = await runCommand(['up'])
        expect(stdout).to.contain(`Project not initialized. Run 'hereya init' first.`)
    })

    it('provisions all packages in the project', async () => {
        sinon.stub(envManager, 'addProjectEnv').resolves()
        await runCommand(['up'])
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
            envManager.addProjectEnv as SinonStub,
            sinon.match.has('workspace', 'my-workspace')
        )
    })

    it('provisions all packages in the project for the specified workspace', async () => {
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'another-workspace.yaml'),
            'name: another-workspace\nid: another-workspace\n'
        )
        sinon.stub(envManager, 'addProjectEnv').resolves()
        await runCommand(['up', '--workspace', 'another-workspace'])
        sinon.assert.calledTwice(localInfrastructure.provision as SinonStub)
        sinon.assert.calledWithMatch(
            envManager.addProjectEnv as SinonStub,
            sinon.match.has('workspace', 'another-workspace')
        )
    })

    it('destroys removed packages', async () => {
        await fs.mkdir(path.join(homeDir, '.hereya', 'state', 'projects', 'my-workspace'), { recursive: true })
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'projects', 'my-workspace', 'test-project.yaml'),
            `
            project: test-project
            workspace: my-workspace
            packages:
              cloudy/docker_postgres:
                version: ''
              removed/package:
                version: ''
              another/package:
                version: ''
            `
        )
        await runCommand(['up'])
        sinon.assert.calledTwice(localInfrastructure.provision as SinonStub)
        sinon.assert.calledOnce(localInfrastructure.destroy as SinonStub)
        sinon.assert.calledWithMatch(
            localInfrastructure.destroy as SinonStub,
            sinon.match.has('pkgName', 'removed/package')
        )
    })

    it('updates the project state file', async () => {
        await fs.mkdir(path.join(homeDir, '.hereya', 'state', 'projects', 'my-workspace'), { recursive: true })
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'projects', 'my-workspace', 'test-project.yaml'),
            `
            project: test-project
            workspace: my-workspace
            packages:
              cloudy/docker_postgres:
                version: ''
              removed/package:
                version: ''
              another/package:
                version: ''
            `
        )
        await runCommand(['up'])
        const projectState = await fs.readFile(path.join(homeDir, '.hereya', 'state', 'projects', 'my-workspace', 'test-project.yaml'), { encoding: 'utf8' })
        expect(projectState).to.contain('cloudy/docker_postgres')
        expect(projectState).to.contain('another/package')
        expect(projectState).not.to.contain('removed/package')
    })
})
