import { expect, test } from '@oclif/test';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { localBackend } from '../../backend/index.js';
import { localInfrastructure } from '../../infrastructure/index.js';
import { packageManager } from '../../lib/package/index.js';

describe('remove', () => {
    const setupTest = test
    .add('rootDir', path.join(os.tmpdir(), 'hereya-test-remove', randomUUID()))
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
    .command(['remove', 'cloudy/docker_postgres'])
    .it('does not work on uninitialized projects', async ctx => {
        expect(ctx.stderr).to.contain(`Project not initialized. Run 'hereya init' first.`)
    })


    setupTest
    .do(async (ctx) => {
        await fs.writeFile(path.join(ctx.rootDir, 'hereya.yaml'), 'project: test-project\nworkspace: test-workspace\n')
    })
    .stub(packageManager, 'getRepoContent', stub => stub.resolves({ found: false, reason: 'not found' }))
    .command(['remove', 'not/exist'])
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
    .command(['remove', 'wrong/infra'])
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
    .command(['remove', 'unsupported/infra'])
    .exit(2)
    .it('fails for infra different from local')

    setupTest
    .do(async (ctx) => {
        await fs.writeFile(path.join(ctx.rootDir, 'hereya.yaml'),
            `
            project: test-project
            workspace: dev
            packages:
               cloudy/docker_postgres:
                   version: "1.0.0"
            `
        )
    })
    .do(async (ctx) => {
        await fs.mkdir(path.join(ctx.rootDir, '.hereya'), { recursive: true })
        await fs.writeFile(path.join(ctx.rootDir, '.hereya', 'env.dev.yaml'),
            `
            FOO: local:BAR
            GIB: local:legendary
            AND: local:another
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
    .stub(localInfrastructure, 'destroy', stub => stub.resolves({
        env: { FOO: "BAR", GIB: "legendary" },
        success: true
    }))
    .stub(localBackend, 'saveState', stub => stub.resolves())
    .command(['remove', 'cloudy/docker_postgres'])
    .it('removes a package and its env variables from the project', async ctx => {
        const envFile = await fs.readFile(path.join(ctx.rootDir, '.hereya', 'env.dev.yaml'), 'utf8')
        expect(envFile).to.not.contain('FOO: local:BAR')
        expect(envFile).to.not.contain('GIB: local:legendary')
        expect(envFile).to.contain('AND: local:another')
        const hereyaYaml = await fs.readFile(path.join(ctx.rootDir, 'hereya.yaml'), 'utf8')
        expect(hereyaYaml).to.not.contain('cloudy/docker_postgres')
    })

})
