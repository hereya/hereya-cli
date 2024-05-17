import { expect, test } from '@oclif/test';
import { randomUUID } from 'node:crypto';
import fs, { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

describe('run', () => {
    const setupTest = test
    .add('rootDir', path.join(os.tmpdir(), 'hereya-test-run', randomUUID()))
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
    .command(['run', 'ls'])
    .it('does not work on uninitialized projects', async ctx => {
        expect(ctx.stderr).to.contain(`Project not initialized. Run 'hereya init' first.`)
    })

    setupTest
    .do(async (ctx) => {
        await fs.writeFile(path.join(ctx.rootDir, 'hereya.yaml'), 'project: test-project\n')
    })
    .command(['run', 'ls'])
    .exit(2)
    .it('fails if workspace is not set')

    setupTest
    .do(async (ctx) => {
        await fs.writeFile(path.join(ctx.rootDir, 'hereya.yaml'), 'project: test-project\nworkspace: dev\n')
        await mkdir(path.join(ctx.rootDir, '.hereya'))
        await writeFile(path.join(ctx.rootDir, '.hereya', 'env.dev.yaml'), 'FOO: local:bar\n')
        await writeFile(path.join(ctx.rootDir, '.hereya', 'env.another.yaml'), 'GLUE: local:not_here\n')
    })
    .command(['run', '--', `node -e "if (process.env.FOO !== 'bar') { throw 'FOO not equals bar' }"`])
    .it('runs a command with hereya env vars in the right workspace')

    setupTest
    .do(async (ctx) => {
        await fs.writeFile(path.join(ctx.rootDir, 'hereya.yaml'), 'project: test-project\n')
    })
    .command(['run', 'ls'])
    .exit(2)
    .it('fails if workspace is not set')

    setupTest
    .do(async (ctx) => {
        await fs.writeFile(path.join(ctx.rootDir, 'hereya.yaml'), 'project: test-project\nworkspace: dev\n')
        await mkdir(path.join(ctx.rootDir, '.hereya'))
        await writeFile(path.join(ctx.rootDir, '.hereya', 'env.dev.yaml'), 'FOO: local:bar\n')
        await writeFile(path.join(ctx.rootDir, '.hereya', 'env.another.yaml'), 'GLUE: local:here\n')
    })
    .command(['run', '-w', 'another', '--', `node -e "if (process.env.GLUE !== 'here') { throw 'GLUE not equals here' }"`])
    .it('overrides the workspace with the -w flag')

})
