import { expect, test } from '@oclif/test';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

describe('env', () => {
    const setupTest = test
    .add('rootDir', path.join(os.tmpdir(), 'hereya-test-env', randomUUID()))
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
    .command(['env'])
    .it('does not work on uninitialized projects', async ctx => {
        expect(ctx.stderr).to.contain(`Project not initialized. Run 'hereya init' first.`)
    })

    setupTest
    .do(async (ctx) => {
        await fs.writeFile(path.join(ctx.rootDir, 'hereya.yaml'), 'project: test-project\n')
    })
    .command(['env'])
    .exit(2)
    .it('fails if workspace is not set')

    setupTest
    .do(async (ctx) => {
        await fs.writeFile(
            path.join(ctx.rootDir, 'hereya.yaml'),
            `
            project: test-project
            workspace: my-workspace
            packages:
              cloud/pkg:
                version: ''
            `
        )
        await fs.mkdir(path.join(ctx.rootDir, '.hereya'), { recursive: true })
        await fs.writeFile(
            path.join(ctx.rootDir, '.hereya', 'env.my-workspace.yaml'),
            `
            FOO: local:bar
            GIB: local:legendary
            `
        )
        await fs.writeFile(
            path.join(ctx.rootDir, '.hereya', 'env.another.yaml'),
            `
            GLUE: local:not_me
            `
        )
    })
    .command(['env'])
    .it('prints the env vars for the right workspace', async ctx => {
        expect(ctx.stdout).to.contain('FOO=bar')
        expect(ctx.stdout).to.contain('GIB=legendary')
        expect(ctx.stdout).to.not.contain('GLUE')
    })

    setupTest
    .do(async (ctx) => {
        await fs.writeFile(
            path.join(ctx.rootDir, 'hereya.yaml'),
            `
            project: test-project
            workspace: default
            packages:
              cloud/pkg:
                version: ''
            `
        )
        await fs.mkdir(path.join(ctx.rootDir, '.hereya'), { recursive: true })
        await fs.writeFile(
            path.join(ctx.rootDir, '.hereya', 'env.default.yaml'),
            `
            FOO: local:bar
            GIB: local:legendary
            `
        )
        await fs.writeFile(
            path.join(ctx.rootDir, '.hereya', 'env.another.yaml'),
            `
            GLUE: local:now_me
            `
        )
    })
    .command(['env', '-w', 'another'])
    .it('can override the workspace with the -w flag', async ctx => {
        expect(ctx.stdout).to.contain('GLUE=now_me')
        expect(ctx.stdout).to.not.contain('FOO')
        expect(ctx.stdout).to.not.contain('GIB')
    })

})
