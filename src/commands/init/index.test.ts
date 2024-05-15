import { expect, test } from '@oclif/test'
import * as fs from 'node:fs';

describe('init', () => {
    test
    .stdout()
    .do(() => {
        fs.mkdirSync('./tmp/myProject', { recursive: true })
    })
    .finally(() => {
        fs.rmSync('./tmp/myProject', { force: true, recursive: true })
    })
    .command(['init', 'myProject', '--chdir=./tmp/myProject'])
    .it('creates hereya.yaml', ctx => {
        expect(() => fs.accessSync('./tmp/myProject/hereya.yaml')).to.not.throw()
        expect(ctx.stdout).to.contain('Initialized myProject.')
    })


    test
    .stdout()
    .do(() => {
        fs.mkdirSync('./tmp/myProject', { recursive: true })
    })
    .finally(() => {
        fs.rmSync('./tmp/myProject', { force: true, recursive: true })
    })
    .command(['init', 'myProject', '-w=myWorkspace', '--chdir=./tmp/myProject'])
    .it('set default workspace with "-w" option', ctx => {
        expect(ctx.stdout).to.contain('Default workspace set to myWorkspace')
    })

    test
    .stdout()
    .stderr()
    .do(() => {
        fs.mkdirSync('./tmp/myProject', { recursive: true })
        fs.writeFileSync('./tmp/myProject/hereya.yaml', 'project: myProject\nworkspace: myWorkspace')
    })
    .finally(() => {
        fs.rmSync('./tmp/myProject', { force: true, recursive: true })
    })
    .command(['init', 'myProject2', '--chdir=./tmp/myProject'])
    .it('does nothing if project already initialized', ctx => {
        const content = fs.readFileSync('./tmp/myProject/hereya.yaml', 'utf8')
        expect(content).to.contain('project: myProject\nworkspace: myWorkspace')
        expect(ctx.stderr).to.contain(`Project already initialized.`)
    });
})

