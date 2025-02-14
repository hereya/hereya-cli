import { runCommand } from '@oclif/test'
import { expect } from 'chai'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import * as sinon from 'sinon'
import { SinonStub } from 'sinon'

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
                onDeploy:
                  pkg: cloudy/aws-postgres
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
                    dependencies:
                       cloudy/deploy-dep1: ''
                       cloudy/deploy-dep2: '0.1.0'
                    `,
                    found: true,
                    pkgUrl: 'https://github.com/cloudy/fake-deploy',
                }
            }

            if (repo === 'docker_postgres') {
                return {
                    content:
                        `
                    iac: terraform
                    infra: local
                    onDeploy:
                        pkg: cloudy/aws-postgres
                        version: ''
                    `,
                    found: true,
                    pkgUrl: 'https://github.com/cloudy/docker_postgres',
                }
            }

            return {
                content:
                    `
                iac: terraform
                infra: local
                `,
                found: true,
                pkgUrl: 'https://github.com/cloudy/docker_postgres',
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
        const { stdout } = await runCommand(['deploy', '-w', 'my-workspace'])
        expect(stdout).to.contain(`Project not initialized. Run 'hereya init' first.`)
    })

    it('provisions all packages in the project using the deployment companion package and dependencies when applicable and depl', async () => {
        sinon.stub(envManager, 'addProjectEnv').resolves()
        await runCommand(['deploy', '-w', 'my-workspace'])
        expect((localInfrastructure.provision as SinonStub).callCount).to.equal(4)
        sinon.assert.calledWithMatch(
            localInfrastructure.provision as SinonStub,
            sinon.match.has('pkgName', 'cloudy/aws-postgres')
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

    it('provides user-defined env vars if provided to the deploy package', async () => {
        await fs.mkdir(path.join(rootDir, 'hereyastaticenv'), { recursive: true })
        await fs.writeFile(path.join(rootDir, 'hereyastaticenv', 'env.yaml'), 'FOO: bar\n')
        await fs.writeFile(path.join(rootDir, 'hereyastaticenv', 'env.my-workspace.yaml'), 'GOOD: bad\n')
        sinon.stub(envManager, 'addProjectEnv').resolves()
        await runCommand(['deploy', '-w', 'my-workspace'])
        sinon.assert.calledWithMatch(
            localInfrastructure.deploy as SinonStub,
            sinon.match.has('projectEnv', {FOO: 'bar', GOOD: 'bad'})
        )
    })

    it('provisions all packages in the project for the specified workspace', async () => {
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'another-workspace.yaml'),
            `
            name: another-workspace
            id: another-workspace
            env:
              ENV_VAR: local:value
            `
        )
        sinon.stub(envManager, 'addProjectEnv').resolves()
        sinon.stub(envManager, 'getProjectEnv').resolves({ env: {} })
        await runCommand(['deploy', '--workspace', 'another-workspace'])

        expect((localInfrastructure.provision as SinonStub).callCount).to.equal(4)
        sinon.assert.alwaysCalledWithMatch(
            localInfrastructure.provision as SinonStub,
            sinon.match.has('env', sinon.match.has('ENV_VAR', 'value'))
        )
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
        await fs.mkdir(path.join(homeDir, '.hereya', 'state', 'projects', 'my-workspace'), { recursive: true })
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'projects', 'my-workspace', 'test-project.yaml'),
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
        await runCommand(['deploy', '-w', 'my-workspace'])
        expect((localInfrastructure.provision as SinonStub).callCount).to.equal(4)
        expect((localInfrastructure.destroy as SinonStub).callCount).to.equal(3)
        sinon.assert.calledWithMatch(
            localInfrastructure.destroy as SinonStub,
            sinon.match.has('pkgName', 'removed/package')
        )
        sinon.assert.calledWithMatch(
            localInfrastructure.destroy as SinonStub,
            sinon.match.has('pkgName', 'cloudy/deploy-dep1')
        )
        sinon.assert.calledWithMatch(
            localInfrastructure.destroy as SinonStub,
            sinon.match.has('pkgName', 'cloudy/deploy-dep2')
        )
        sinon.assert.calledOnce(localInfrastructure.deploy as SinonStub)
        sinon.assert.calledOnce(localInfrastructure.undeploy as SinonStub)
        sinon.assert.calledWithMatch(
            localInfrastructure.undeploy as SinonStub,
            sinon.match.has('pkgName', 'removed/dummy-deployer')
        )
    })

    it('updates the project state file', async () => {
        await fs.mkdir(path.join(homeDir, '.hereya', 'state', 'projects', 'my-workspace'), { recursive: true })
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'projects', 'my-workspace', 'test-project.yaml'),
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
        await runCommand(['deploy', '-w', 'my-workspace'])
        const projectState = await fs.readFile(path.join(homeDir, '.hereya', 'state', 'projects', 'my-workspace', 'test-project.yaml'), { encoding: 'utf8' })
        expect(projectState).to.contain('cloudy/docker_postgres')
        expect(projectState).to.contain('another/package')
        expect(projectState).not.to.contain('removed/package')
        expect(projectState).to.contain('cloudy/fake-deploy')
        expect(projectState).not.to.contain('removed/dummy-deployer')
    })

})
