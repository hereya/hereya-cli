import { expect, test } from '@oclif/test'
import * as fs from 'node:fs';

describe('init', () => {
    const setup = test
    .stdout()
    .do(() => {
        fs.mkdirSync('./tmp/myProject', { recursive: true })
    })
    .finally(() => {
        fs.rmSync('./tmp/myProject', { force: true, recursive: true })
    })

    setup.command(['init', 'myProject', '--workspace=demo', '--chdir=./tmp/myProject'])
    .it('creates hereya.yaml and set current workspace', ctx => {
        expect(() => fs.accessSync('./tmp/myProject/hereya.yaml')).to.not.throw()
        expect(ctx.stdout).to.contain('Initialized myProject')
        expect(ctx.stdout).to.contain('Current workspace set to demo')
    })

    setup
    .stderr()
    .do(() => {
        fs.writeFileSync('./tmp/myProject/hereya.yaml', 'project: myProject\nworkspace: myWorkspace')
    })
    .command(['init', 'myProject2', '--workspace=dev', '--chdir=./tmp/myProject'])
    .it('does nothing if project already initialized', ctx => {
        const content = fs.readFileSync('./tmp/myProject/hereya.yaml', 'utf8')
        expect(content).to.contain('project: myProject\nworkspace: myWorkspace')
        expect(ctx.stderr).to.contain(`Project already initialized.`)
    });
})

