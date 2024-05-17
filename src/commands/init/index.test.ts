import { expect, test } from '@oclif/test'
import { randomUUID } from 'node:crypto';
import { accessSync, readFileSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

describe('init', () => {
    const setup = test
    .add('rootDir', path.join(os.tmpdir(), 'hereya-test-init', randomUUID()))
    .do(async (ctx) => {
        await fs.mkdir(ctx.rootDir, { recursive: true })
        process.env.HEREYA_PROJECT_ROOT_DIR = ctx.rootDir
    })
    .stderr()
    .stdout()
    .finally(async (ctx) => {
        await fs.rm(ctx.rootDir, { force: true, recursive: true })
    })

    setup.command(['init', 'myProject', '--workspace=demo'])
    .it('creates hereya.yaml and set current workspace', async ctx => {
        expect(() => accessSync(path.join(ctx.rootDir, 'hereya.yaml'))).to.not.throw()
        expect(ctx.stdout).to.contain('Initialized project myProject')
        expect(ctx.stdout).to.contain('Current workspace set to demo')
    })

    setup
    .stderr()
    .do(async (ctx) => {
        await fs.writeFile(path.join(ctx.rootDir, 'hereya.yml'), 'project: myProject\nworkspace: myWorkspace')
    })
    .command(['init', 'myProject2', '--workspace=dev'])
    .it('does nothing if project already initialized', ctx => {
        const content = readFileSync(path.join(ctx.rootDir, 'hereya.yml'), 'utf8')
        expect(content).to.contain('project: myProject\nworkspace: myWorkspace')
        expect(ctx.stderr).to.contain(`Project already initialized.`)
    });
})

