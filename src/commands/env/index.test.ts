import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

describe('env', () => {
    let rootDir: string

    beforeEach(async () => {
        rootDir = path.join(os.tmpdir(), 'hereya-test-env', randomUUID())
        await fs.mkdir(rootDir, { recursive: true })
        process.env.HEREYA_PROJECT_ROOT_DIR = rootDir
    })

    afterEach(async () => {
        await fs.rm(rootDir, { force: true, recursive: true })
    })

    it('does not work on uninitialized projects', async () => {
        const { stderr } = await runCommand(['env'])
        expect(stderr).to.contain(`Project not initialized. Run 'hereya init' first.`)
    })

    it('fails if workspace is not set', async () => {
        await fs.writeFile(path.join(rootDir, 'hereya.yaml'), 'project: test-project\n')
        const { error } = await runCommand(['env'])
        expect(error?.oclif?.exit).to.equal(2)
    });

    it('prints the env vars for the right workspace', async () => {
        await fs.writeFile(
            path.join(rootDir, 'hereya.yaml'),
            `
            project: test-project
            workspace: my-workspace
            packages:
              cloud/pkg:
                version: ''
            `
        )
        await fs.mkdir(path.join(rootDir, '.hereya'), { recursive: true })
        await fs.writeFile(
            path.join(rootDir, '.hereya', 'env.my-workspace.yaml'),
            `
            FOO: local:bar
            GIB: local:legendary
            `
        )
        await fs.writeFile(
            path.join(rootDir, '.hereya', 'env.another.yaml'),
            `
            GLUE: local:not_me
            `
        )
        const { stdout } = await runCommand(['env'])
        expect(stdout).to.contain('FOO=bar')
        expect(stdout).to.contain('GIB=legendary')
        expect(stdout).to.not.contain('GLUE')
    })

    it('can override the workspace with the -w flag', async () => {
        await fs.writeFile(
            path.join(rootDir, 'hereya.yaml'),
            `
            project: test-project
            workspace: default
            packages:
              cloud/pkg:
                version: ''
            `
        )
        await fs.mkdir(path.join(rootDir, '.hereya'), { recursive: true })
        await fs.writeFile(
            path.join(rootDir, '.hereya', 'env.default.yaml'),
            `
            FOO: local:bar
            GIB: local:legendary
            `
        )
        await fs.writeFile(
            path.join(rootDir, '.hereya', 'env.another.yaml'),
            `
            GLUE: local:now_me
            `
        )
        const { stdout } = await runCommand(['env', '-w', 'another'])
        expect(stdout).to.contain('GLUE=now_me')
        expect(stdout).to.not.contain('FOO')
        expect(stdout).to.not.contain('GIB')
    })
})
