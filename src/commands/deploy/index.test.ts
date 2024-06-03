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

describe('deploy', () => {
    let homeDir: string
    let rootDir: string

    beforeEach(async () => {
        homeDir = path.join(os.tmpdir(), 'hereya-test-deploy', randomUUID())
        sinon.stub(os, 'homedir').returns(homeDir)
        await fs.mkdir(path.join(homeDir, '.hereya', 'state', 'workspaces'), { recursive: true })

        rootDir = path.join(os.tmpdir(), 'hereya-test', randomUUID())
        await fs.mkdir(rootDir, { recursive: true })
        process.env.HEREYA_PROJECT_ROOT_DIR = rootDir

        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'my-workspace.yaml'),
            'name: my-workspace\nid: my-workspace\n'
        )

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
            deploy:
              cloudy/fake-deploy:
                version: ''
            `
        )

        sinon.stub(packageManager, 'getRepoContent').callsFake(async ({ repo }) => {
            if (repo === 'fake-deploy' || repo === 'dummy-deployer') {
                return {
                    content:
                        `
                    iac: terraform
                    infra: local
                    deploy: true
                    `,
                    found: true,
                }
            }

            return {
                content:
                    `
                iac: terraform
                infra: local
                `,
                found: true,
            }
        })

        sinon.stub(localInfrastructure, 'provision').resolves({
            env: {},
            success: true
        });
        sinon.stub(localInfrastructure, 'destroy').resolves({
            env: {},
            success: true
        });
        sinon.stub(localInfrastructure, 'deploy').resolves({
            env: {},
            success: true
        });
        sinon.stub(localInfrastructure, 'undeploy').resolves({
            env: {},
            success: true
        });
    });

    afterEach(async () => {
        sinon.restore()
        await fs.rm(rootDir, { force: true, recursive: true })
        await fs.rm(homeDir, { force: true, recursive: true })
    })

    it('fails if the project is not initialized', async () => {
        await fs.rm(path.join(rootDir, 'hereya.yaml'))
        const { stderr } = await runCommand(['deploy'])
        expect(stderr).to.contain(`Project not initialized. Run 'hereya init' first.`)
    })

    it('provisions all packages in the project', async () => {
        sinon.stub(envManager, 'addProjectEnv').resolves()
        await runCommand(['deploy'])
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
            localInfrastructure.deploy as SinonStub,
            sinon.match.has('pkgName', 'cloudy/fake-deploy')
        )
    })

    it('provisions all packages in the project for the specified workspace', async () => {
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'another-workspace.yaml'),
            'name: another-workspace\nid: another-workspace\n'
        )
        sinon.stub(envManager, 'addProjectEnv').resolves()
        sinon.stub(envManager, 'getProjectEnv').resolves({ env: {} })
        await runCommand(['deploy', '--workspace', 'another-workspace'])

        sinon.assert.calledTwice(localInfrastructure.provision as SinonStub)
        sinon.assert.calledWithMatch(
            envManager.addProjectEnv as SinonStub,
            sinon.match.has('workspace', 'another-workspace')
        )
        sinon.assert.calledOnce(localInfrastructure.deploy as SinonStub)
        sinon.assert.calledWithMatch(
            envManager.getProjectEnv as SinonStub,
            sinon.match.has('workspace', 'another-workspace')
        )
    })

    it('destroys removed packages', async () => {
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
            deploy:
              cloudy/fake-deploy:
                version: ''
              removed/dummy-deployer:
                version: ''
            `
        )
        await runCommand(['deploy'])
        sinon.assert.calledTwice(localInfrastructure.provision as SinonStub)
        sinon.assert.calledOnce(localInfrastructure.destroy as SinonStub)
        sinon.assert.calledWithMatch(
            localInfrastructure.destroy as SinonStub,
            sinon.match.has('pkgName', 'removed/package')
        )
        sinon.assert.calledOnce(localInfrastructure.deploy as SinonStub)
        sinon.assert.calledOnce(localInfrastructure.undeploy as SinonStub)
        sinon.assert.calledWithMatch(
            localInfrastructure.undeploy as SinonStub,
            sinon.match.has('pkgName', 'removed/dummy-deployer')
        )
    })

    it('updates the project state file', async () => {
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
            deploy:
              cloudy/fake-deploy:
                version: ''
              removed/dummy-deployer:
                version: ''
            `
        )
        await runCommand(['deploy'])
        const projectState = await fs.readFile(path.join(homeDir, '.hereya', 'state', 'projects', 'test-project.yaml'), { encoding: 'utf8' })
        expect(projectState).to.contain('cloudy/docker_postgres')
        expect(projectState).to.contain('another/package')
        expect(projectState).not.to.contain('removed/package')
        expect(projectState).to.contain('cloudy/fake-deploy')
        expect(projectState).not.to.contain('removed/dummy-deployer')
    })

})
