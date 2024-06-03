import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import { randomUUID } from 'node:crypto';
import fs, { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sinon from 'sinon';

describe('run', () => {
    let rootDir: string

    beforeEach(async () => {
        rootDir = path.join(os.tmpdir(), 'hereya-test-run', randomUUID())
        await fs.mkdir(rootDir, { recursive: true })
        process.env.HEREYA_PROJECT_ROOT_DIR = rootDir
    })

    afterEach(async () => {
        sinon.restore()
        await fs.rm(rootDir, { force: true, recursive: true })
    })

    it('does not work on uninitialized projects', async () => {
        const { stderr } = await runCommand(['run', 'ls'])
        expect(stderr).to.contain(`Project not initialized. Run 'hereya init' first.`)
    })

    it('fails if workspace is not set', async () => {
        await fs.writeFile(path.join(rootDir, 'hereya.yaml'), 'project: test-project\n')
        const { error } = await runCommand(['run', 'ls'])
        expect(error?.oclif?.exit).to.equal(2)
    })

    it('runs a command with hereya env vars in the right workspace', async () => {
        await fs.writeFile(path.join(rootDir, 'hereya.yaml'), 'project: test-project\nworkspace: dev\n')
        await mkdir(path.join(rootDir, '.hereya'))
        await writeFile(path.join(rootDir, '.hereya', 'env.dev.yaml'), 'FOO: local:bar\n')
        await writeFile(path.join(rootDir, '.hereya', 'env.another.yaml'), 'GLUE: local:not_here\n')

        await fs.writeFile(path.join(rootDir, 'index.js'),
            `
            const assert = require('node:assert')
            assert(process.env.FOO === 'bar')
            `
        )
        const { error } = await runCommand(['run', '--', 'node', 'index.js'])
        expect(error).to.be.undefined
    })

    it('fails if workspace is not set', async () => {
        await fs.writeFile(path.join(rootDir, 'hereya.yaml'), 'project: test-project\n')
        const { error } = await runCommand(['run', 'ls'])
        expect(error?.oclif?.exit).to.equal(2)
    });

    it('overrides the workspace with the -w flag', async () => {
        await fs.writeFile(path.join(rootDir, 'hereya.yaml'), 'project: test-project\nworkspace: dev\n')
        await mkdir(path.join(rootDir, '.hereya'))
        await writeFile(path.join(rootDir, '.hereya', 'env.dev.yaml'), 'FOO: local:bar\n')
        await writeFile(path.join(rootDir, '.hereya', 'env.another.yaml'), 'GLUE: local:here\n')
        await fs.writeFile(path.join(rootDir, 'index.js'),
            `
            const assert = require('node:assert')
            assert(process.env.GLUE === 'here')
            `
        )
        const { error } = await runCommand(['run', '-w', 'another', '--', 'node', 'index.js'])
        expect(error).to.be.undefined
    });
})
