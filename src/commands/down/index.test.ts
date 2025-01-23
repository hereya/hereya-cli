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
import { load } from '../../lib/yaml-utils.js';

describe('down', () => {
    let homeDir: string
    let rootDir: string

    beforeEach(async () => {
        homeDir = path.join(os.tmpdir(), 'hereya-test-install', randomUUID())
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
            pkgUrl: 'https://github.com/cloudy/fake-deploy',
        })
        sinon.stub(localInfrastructure, 'provision').resolves({
            env: {},
            success: true
        })
        sinon.stub(localInfrastructure, 'destroy').resolves({
            env: {
                BAZ: 'qux',
                FOO: 'bar',
            },
            success: true
        })
    });

    afterEach(async () => {
        sinon.restore()
        await fs.rm(rootDir, { force: true, recursive: true })
        await fs.rm(homeDir, { force: true, recursive: true })
    });

    it('fails if the project is not initialized', async () => {
        await fs.rm(path.join(rootDir, 'hereya.yaml'))
        const { stderr } = await runCommand(['down'])
        expect(stderr).to.contain(`Project not initialized. Run 'hereya init' first.`)
    })

    it('destroys all packages in the project', async () => {
        sinon.stub(envManager, 'removeProjectEnv').resolves();
        await runCommand(['down'])
        sinon.assert.calledTwice(localInfrastructure.destroy as SinonStub);
        sinon.assert.calledWithMatch(
            localInfrastructure.destroy as SinonStub,
            sinon.match.has('pkgName', 'cloudy/docker_postgres')
        );
        sinon.assert.calledWithMatch(
            localInfrastructure.destroy as SinonStub,
            sinon.match.has('pkgName', 'another/package')
        );
        sinon.assert.calledWithMatch(
            envManager.removeProjectEnv as SinonStub,
            sinon.match.has('workspace', 'my-workspace')
        );
    })

    it('destroys all packages in the project for the specified workspace', async () => {
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'another-workspace.yaml'),
            'name: another-workspace\nid: another-workspace\n'
        )
        sinon.stub(envManager, 'removeProjectEnv').resolves()
        await runCommand(['down', '--workspace', 'another-workspace'])
        sinon.assert.calledTwice(localInfrastructure.destroy as SinonStub)
        sinon.assert.calledWithMatch(
            envManager.removeProjectEnv as SinonStub,
            sinon.match.has('workspace', 'another-workspace')
        )
    })

    it('clears up the workspace environment file', async () => {
        await fs.mkdir(path.join(rootDir, '.hereya'), { recursive: true })
        await fs.writeFile(
            path.join(rootDir, '.hereya', 'env.my-workspace.yaml'),
            `
            FOO: bar
            BAZ: qux
            `
        )
        await runCommand(['down'])
        const file$ = await load(path.join(rootDir, '.hereya', 'env.my-workspace.yaml'))
        if (file$.found) {
            expect(file$.data).to.deep.equal({})
        }
    })

    it('updates the state file', async () => {
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
        await runCommand(['down'])
        const projectState = await fs.readFile(path.join(homeDir, '.hereya', 'state', 'projects', 'test-project.yaml'), { encoding: 'utf8' })
        expect(projectState).to.contain('cloudy/docker_postgres')
        expect(projectState).to.contain('another/package')
        expect(projectState).not.to.contain('removed/package')
    })
});

