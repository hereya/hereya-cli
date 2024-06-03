import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import { randomUUID } from 'node:crypto';
import { accessSync, readFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

describe('init', () => {
    let rootDir: string

    beforeEach(async () => {
        rootDir = path.join(os.tmpdir(), 'hereya-test-init', randomUUID())
        await fs.mkdir(rootDir, { recursive: true })
        process.env.HEREYA_PROJECT_ROOT_DIR = rootDir
    })

    afterEach(async () => {
        await fs.rm(rootDir, { force: true, recursive: true })
    });

    it('creates hereya.yaml and set current workspace', async () => {
        const { stdout } = await runCommand(['init', 'myProject', '--workspace=demo'])
        expect(() => accessSync(path.join(rootDir, 'hereya.yaml'))).to.not.throw()
        expect(stdout).to.contain('Initialized project myProject')
        expect(stdout).to.contain('Current workspace set to demo')
    })

    it('does nothing if project already initialized', async () => {
        await fs.writeFile(path.join(rootDir, 'hereya.yml'), 'project: myProject\nworkspace: myWorkspace')
        const { stderr } = await runCommand(['init', 'myProject2', '--workspace=dev'])
        const content = readFileSync(path.join(rootDir, 'hereya.yml'), 'utf8')
        expect(content).to.contain('project: myProject\nworkspace: myWorkspace')
        expect(stderr).to.contain(`Project already initialized.`)
    })

})

