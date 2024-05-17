import { expect, test } from '@oclif/test'
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import path from 'node:path';

import { localBackend } from '../../backend/index.js';
import { localInfrastructure } from '../../infrastructure/index.js';
import { packageManager } from '../../lib/package/index.js';

describe('add', () => {
    const setupTest = test
    .add('rootDir', path.join(os.tmpdir(), 'hereya-test', randomUUID()))
    .do(async (ctx) => {
        await fs.mkdir(ctx.rootDir, { recursive: true })
        process.env.HEREYA_PROJECT_ROOT_DIR = ctx.rootDir
    })
    .stderr()
    .stdout()
    .finally(async (ctx) => {
        await fs.rm(ctx.rootDir, { force: true, recursive: true })
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
        iac: cdk
        infra: aws
        `,
        found: true,
    }))
    .command(['add', 'unsupported/infra'])
    .exit(2)
    .it('fails for infra different from local')


    setupTest
    .do(async (ctx) => {
        await fs.writeFile(path.join(ctx.rootDir, 'hereya.yaml'),
            `
            project: test-project
            workspace: dev
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
    .command(['add', 'cloudy/docker_postgres'])
    .it('adds a package to the project and save exported variables', async ctx => {
        const envFile = await fs.readFile(path.join(ctx.rootDir, '.hereya', 'env.dev.yaml'), { encoding: 'utf8' })
        expect(envFile).to.contain('FOO: local:BAR')
        expect(envFile).to.contain('GIB: local:legendary')
        const hereyaYaml = await fs.readFile(path.join(ctx.rootDir, 'hereya.yaml'), { encoding: 'utf8' })
        expect(hereyaYaml).to.contain('cloudy/docker_postgres')
    })

})
