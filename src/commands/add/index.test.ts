import { expect, test } from '@oclif/test'
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sinon, { SinonStub } from 'sinon';

import { localBackend } from '../../backend/index.js';
import { localInfrastructure } from '../../infrastructure/index.js';
import { packageManager } from '../../lib/package/index.js';

describe('add', () => {
    const homeDir = path.join(os.tmpdir(), 'hereya-test-add', randomUUID())

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
            path.join(homeDir, '.hereya', 'state', 'workspaces', 'test-workspace.yaml'),
            'name: test-workspace\nid: test-workspace\n'
        )
    })
    .stderr()
    .stdout()
    .finally(async (ctx) => {
        await fs.rm(ctx.rootDir, { force: true, recursive: true })
        await fs.rm(homeDir, { force: true, recursive: true })
    })



    setupTest
    .command(['add', 'cloudy/docker_postgres'])
    .it('does not add a package if the project is not initialized', async ctx => {
        expect(ctx.stderr).to.contain(`Project not initialized. Run 'hereya init' first.`)
    })


    setupTest
    .do(async (ctx) => {
        await fs.writeFile(path.join(ctx.rootDir, 'hereya.yaml'), 'project: test-project\nworkspace: test-workspace\n')
    })
    .stub(packageManager, 'getRepoContent', stub => stub.resolves({ found: false, reason: 'not found' }))
    .command(['add', 'faky/fake'])
    .exit(2)
    .it('fails if the package cannot be resolved')


    setupTest
    .do(async (ctx) => {
        await fs.writeFile(path.join(ctx.rootDir, 'hereya.yaml'), 'project: test-project\nworkspace: test-workspace\n')
    })
    .stub(packageManager, 'getRepoContent', stub => stub.resolves({
        content: `
        iac: terraform
        infra: invalid
        `,
        found: true,
    }))
    .command(['add', 'wrong/infra'])
    .exit(2)
    .it('fails for invalid infra')


    setupTest
    .do(async (ctx) => {
        await fs.writeFile(path.join(ctx.rootDir, 'hereya.yaml'), 'project: test-project\nworkspace: test-workspace\n')
    })
    .stub(packageManager, 'getRepoContent', stub => stub.resolves({
        content: `
        iac: cdk
        infra: aws
        `,
        found: true,
    }))
    .command(['add', 'unsupported/infra'])
    .exit(2)
    .it('fails for infra different from local')


    const setupSuccessTest = setupTest
    .do(async (ctx) => {
        await fs.writeFile(path.join(ctx.rootDir, 'hereya.yaml'),
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
        env: { FOO: "BAR", GIB: "legendary" },
        success: true
    }))
    .stub(localBackend, 'saveState', stub => stub.resolves())

    setupSuccessTest
    .command(['add', 'cloudy/docker_postgres'])
    .it('adds a package to the project and save exported variables', async ctx => {
        const envFile = await fs.readFile(path.join(ctx.rootDir, '.hereya', 'env.dev.yaml'), { encoding: 'utf8' })
        expect(envFile).to.contain('FOO: local:BAR')
        expect(envFile).to.contain('GIB: local:legendary')
        const hereyaYaml = await fs.readFile(path.join(ctx.rootDir, 'hereya.yaml'), { encoding: 'utf8' })
        expect(hereyaYaml).to.contain('cloudy/docker_postgres')
    })

    setupSuccessTest
    .do(async (ctx) => {
        await fs.mkdir(path.join(ctx.rootDir, 'hereyavars'), { recursive: true })
        await fs.writeFile(
            path.join(ctx.rootDir, 'hereyavars', 'cloudy-docker_postgres.yaml'),
            `
            myParam: myValue
            override: me
            `
        )
        await fs.writeFile(
            path.join(ctx.rootDir, 'hereyavars', 'cloudy-docker_postgres.dev.yaml'),
            `
            override: you
            param1: value0
            `
        )
    })
    .command(['add', 'cloudy/docker_postgres', '-p', 'param1=value1', '-p', 'param2=value2'])
    .it('uses parameters from file and user provided parameters', async () => {
        expect((localInfrastructure.provision as SinonStub).calledWithMatch(sinon.match.has('parameters', {
            myParam: 'myValue',
            override: 'you',
            param1: 'value1',
            param2: 'value2',
        }))).to.be.true
    })

    setupSuccessTest
    .command(['add', 'cloudy/docker_postgres', '--parameter', 'param1=value1', '-p', 'param2=value2'])
    .it('save user provided parameters', async ctx => {
        const paramFile = await fs.readFile(path.join(ctx.rootDir, 'hereyavars', 'cloudy-docker_postgres.yaml'), { encoding: 'utf8' })
        expect(paramFile).to.contain('param1: value1')
        expect(paramFile).to.contain('param2: value2')
    })

    setupSuccessTest
    .do(async (ctx) => {
        await fs.mkdir(path.join(ctx.rootDir, 'hereyavars'), { recursive: true })
        await fs.writeFile(path.join(ctx.rootDir, 'hereyavars', 'cloudy-docker_postgres.yaml'), 'myParam: myValue\n')
    })
    .command(['add', 'cloudy/docker_postgres', '-p', 'param1=value1', '-p', 'param2=value2'])
    .it('does not save user specified parameters if the parameter file exists', async ctx => {
        const paramFile = await fs.readFile(path.join(ctx.rootDir, 'hereyavars', 'cloudy-docker_postgres.yaml'), { encoding: 'utf8' })
        expect(paramFile).to.contain('myParam: myValue')
        expect(paramFile).to.not.contain('param1: value1')
        expect(paramFile).to.not.contain('param2: value2')
    })

})
