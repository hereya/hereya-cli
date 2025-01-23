import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sinon, { SinonStub } from 'sinon';

import { localBackend } from '../../backend/index.js';
import { awsInfrastructure, localInfrastructure } from '../../infrastructure/index.js';
import { Config } from '../../lib/config/common.js';
import { packageManager } from '../../lib/package/index.js';
import { load } from '../../lib/yaml-utils.js';

describe('add', () => {
    let homeDir: string
    let rootDir: string

    beforeEach(async () => {
        homeDir = path.join(os.tmpdir(), 'hereya-test-add', randomUUID())
        sinon.stub(os, 'homedir').returns(homeDir)
        await fs.mkdir(path.join(homeDir, '.hereya', 'state', 'workspaces'), { recursive: true })
        await fs.writeFile(
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'test-workspace.yaml'),
            'name: test-workspace\nid: test-workspace\n'
        )

        rootDir = path.join(os.tmpdir(), 'hereya-test', randomUUID())
        await fs.mkdir(rootDir, { recursive: true })

        process.env.HEREYA_PROJECT_ROOT_DIR = rootDir
    });

    afterEach(async () => {
        await fs.rm(rootDir, { force: true, recursive: true })
        await fs.rm(homeDir, { force: true, recursive: true })
        sinon.restore()
    })

    it('does not add a package if the project is not initialized', async () => {
        const { stdout } = await runCommand(['add', 'cloudy/docker_postgres'])
        expect(stdout).to.contain(`Project not initialized. Run 'hereya init' first.`)
    })

    it('does not add a package if the project is not initialized', async () => {
        const { stdout } = await runCommand(['add', 'cloudy/docker_postgres'])
        expect(stdout).to.contain(`Project not initialized. Run 'hereya init' first.`)
    })

    it('fails if the package cannot be resolved', async () => {
        await fs.writeFile(path.join(rootDir, 'hereya.yaml'), 'project: test-project\nworkspace: test-workspace\n')
        sinon.stub(packageManager, 'getRepoContent').resolves({ found: false, reason: 'not found' })
        const { error } = await runCommand(['add', 'faky/fake'])
        expect(error?.oclif?.exit).to.equal(2)
    })


    it('fails for invalid infra', async () => {
        await fs.writeFile(path.join(rootDir, 'hereya.yaml'), 'project: test-project\nworkspace: test-workspace\n')
        sinon.stub(packageManager, 'getRepoContent').resolves({
            content: `
            iac: terraform
            infra: invalid
            `,
            found: true,
            pkgUrl: 'https://github.com/wrong/infra',
        })
        const { error } = await runCommand(['add', 'wrong/infra'])
        expect(error?.oclif?.exit).to.equal(2)
    });


    it('fails of unsupported infra type', async () => {
        await fs.writeFile(path.join(rootDir, 'hereya.yaml'), 'project: test-project\nworkspace: test-workspace\n')
        sinon.stub(packageManager, 'getRepoContent').resolves({
            content: `
            iac: cdk
            infra: not-supported
            `,
            found: true,
            pkgUrl: 'https://github.com/unsupported/infra',
        })
        const { error } = await runCommand(['add', 'unsupported/infra'])
        expect(error?.oclif?.exit).to.equal(2)
    })

    describe('with success', () => {
        beforeEach(async () => {
            await fs.writeFile(path.join(rootDir, 'hereya.yaml'),
                `
            project: test-project
            workspace: dev
            `
            )
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

            sinon.stub(localInfrastructure, 'provision').resolves({
                env: { FOO: "BAR", GIB: "legendary" },
                success: true
            })
            sinon.stub(localBackend, 'saveState').resolves()

        });

        describe('standard package', () => {
            let getRepoContentStub: SinonStub
            beforeEach(async () => {
                getRepoContentStub = sinon.stub(packageManager, 'getRepoContent').resolves({
                    content:
                        `
                          iac: terraform
                          infra: local
                          `,
                    found: true,
                    pkgUrl: 'https://github.com/cloudy/docker_postgres',
                })
            });

            it('adds a package to the project and save exported variables', async () => {
                await runCommand(['add', 'cloudy/docker_postgres'])
                const envFile = await fs.readFile(path.join(rootDir, '.hereya', 'env.dev.yaml'), { encoding: 'utf8' })
                expect(envFile).to.contain('FOO: local:BAR')
                expect(envFile).to.contain('GIB: local:legendary')
                const hereyaYaml = await fs.readFile(path.join(rootDir, 'hereya.yaml'), { encoding: 'utf8' })
                expect(hereyaYaml).to.contain('cloudy/docker_postgres')
            });

            it('uses parameters from file and user provided parameters', async () => {
                await fs.mkdir(path.join(rootDir, 'hereyavars'), { recursive: true })
                await fs.writeFile(
                    path.join(rootDir, 'hereyavars', 'cloudy-docker_postgres.yaml'),
                    `
                myParam: myValue
                override: me
                `
                )
                await fs.writeFile(
                    path.join(rootDir, 'hereyavars', 'cloudy-docker_postgres.dev.yaml'),
                    `
                override: you
                param1: value0
                `
                )
                await runCommand(['add', 'cloudy/docker_postgres', '-p', 'param1=value1', '-p', 'param2=value2'])
                expect((localInfrastructure.provision as SinonStub).calledWithMatch(sinon.match.has('parameters', {
                    myParam: 'myValue',
                    override: 'you',
                    param1: 'value1',
                    param2: 'value2',
                }))).to.be.true
            })

            it('save user provided parameters', async () => {
                await runCommand(['add', 'cloudy/docker_postgres', '--parameter', 'param1=value1', '-p', 'param2=value2'])
                const paramFile = await fs.readFile(path.join(rootDir, 'hereyavars', 'cloudy-docker_postgres.yaml'), { encoding: 'utf8' })
                expect(paramFile).to.contain('param1: value1')
                expect(paramFile).to.contain('param2: value2')
            })

            it('saves package deployment companion in hereya.yaml', async () => {
                getRepoContentStub.restore()
                getRepoContentStub = sinon.stub(packageManager, 'getRepoContent').resolves({
                    content: `
                    iac: terraform
                    infra: local
                    onDeploy:
                       pkg: cloudy/aws-rds
                       version: 1.0.0
                    `,
                    found: true,
                    pkgUrl: 'https://github.com/cloudy/docker_postgres',
                })
                await runCommand(['add', 'cloudy/docker_postgres'])
                const { data: hereyaYaml } = await load<Config>(path.join(rootDir, 'hereya.yaml'))
                expect(hereyaYaml.packages!['cloudy/docker_postgres']).to.deep.contain({
                    onDeploy: {
                        pkg: 'cloudy/aws-rds',
                        version: '1.0.0'
                    }
                })
            })
        })

        describe('deployment package', () => {
            beforeEach(async () => {
                sinon.stub(packageManager, 'getRepoContent').resolves({
                    content: `
                    iac: cdk
                    infra: aws
                    deploy: true
                    `,
                    found: true,
                    pkgUrl: 'https://github.com/cloudy/fake-deploy',
                })
                sinon.stub(awsInfrastructure, 'provision').resolves({
                    env: {},
                    success: true
                })
            })

            it('skips provisioning if the package is a deployment package', async () => {
                await runCommand(['add', 'cloudy/fake-deploy'])
                sinon.assert.notCalled(awsInfrastructure.provision as SinonStub)
            });

            it('adds a deployment package to the project', async () => {
                await runCommand(['add', 'cloudy/fake-deploy'])
                const { data: hereyaYaml } = await load<Config>(path.join(rootDir, 'hereya.yaml'))
                expect(hereyaYaml).to.have.property('deploy')
                expect(hereyaYaml.deploy).to.have.property('cloudy/fake-deploy')
            })

            it('saves parameters', async () => {
                await runCommand(['add', 'cloudy/fake-deploy', '-p', 'param1=value1', '-p', 'param2=value2'])
                const paramFile = await fs.readFile(path.join(rootDir, 'hereyavars', 'cloudy-fake-deploy.yaml'), { encoding: 'utf8' })
                expect(paramFile).to.contain('param1: value1')
                expect(paramFile).to.contain('param2: value2')
            })

            it('saves the state', async () => {
                await runCommand(['add', 'cloudy/fake-deploy',])
                sinon.assert.calledOnce(localBackend.saveState as SinonStub)
            });
        })
    })
})
