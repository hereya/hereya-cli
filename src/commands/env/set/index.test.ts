import { runCommand } from '@oclif/test'
import { expect } from 'chai'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'


describe('env:set', () => {
  let rootDir: string

  beforeEach(async () => {
    rootDir = path.join(os.tmpdir(), 'hereya-test-env-set', randomUUID())
    await fs.mkdir(rootDir, {recursive: true})
    process.env.HEREYA_PROJECT_ROOT_DIR = rootDir
  })

  afterEach(async () => {
    await fs.rm(rootDir, {force: true, recursive: true})
  })

  it('does not work on uninitialized projects', async () => {
    const {stderr} = await runCommand(['env:set', 'FOO', "-v", "bar"])
    expect(stderr).to.contain('Project not initialized. Run \'hereya init\' first.')
  })

  it('fails if name is not provided', async () => {
    const {error} = await runCommand(['env:set', "-v", "bar"])
    expect(error?.oclif?.exit).to.equal(2)
  })

  it('fails if env value is not provided', async () => {
    const {error} = await runCommand(['env:set', 'FOO'])
    expect(error?.oclif?.exit).to.equal(2)
  })

  it('creates a new env file if it does not exist with the new env var', async () => {
    await fs.writeFile(path.join(rootDir, 'hereya.yaml'), 'project: test-project\n')
    await runCommand(['env:set', 'FOO', "-v", "bar"])
    const envFile = path.join(rootDir, 'hereyastaticenv', 'env.yaml')
    const content = await fs.readFile(envFile, 'utf8')
    expect(content).to.equal('FOO: bar\n')
  })

  it('updates an existing env file with the new env var', async () => {
    await fs.writeFile(path.join(rootDir, 'hereya.yaml'), 'project: test-project\n')
    const envFile = path.join(rootDir, 'hereyastaticenv', 'env.yaml')
    await fs.mkdir(path.dirname(envFile), {recursive: true})
    await fs.writeFile(envFile, 'FOO: baz\n')

    await runCommand(['env:set', 'FOO', "-v", "bar"])

    const content = await fs.readFile(envFile, 'utf8')
    expect(content).to.equal('FOO: bar\n')
  })

  it('add a new env in the file if it does not exist', async () => {
    await fs.writeFile(path.join(rootDir, 'hereya.yaml'), 'project: test-project\n')
    const envFile = path.join(rootDir, 'hereyastaticenv', 'env.yaml')
    await fs.mkdir(path.dirname(envFile), {recursive: true})
    await fs.writeFile(envFile, 'GREETING: Hello\n')
    await runCommand(['env:set', 'FOO', "-v", "bar"])
    const content = await fs.readFile(envFile, 'utf8')
    expect(content).to.contain('GREETING: Hello')
    expect(content).to.contain('FOO: bar')
  })

  it('creates a workspace specific env file if the workspace flag is provided', async () => {
    await fs.writeFile(path.join(rootDir, 'hereya.yaml'), 'project: test-project\n')
    await runCommand(['env:set', 'FOO', "-v", "bar", '--workspace', 'my-workspace'])
    const envFile = path.join(rootDir, 'hereyastaticenv', 'env.my-workspace.yaml')
    const content = await fs.readFile(envFile, 'utf8')
    expect(content).to.contain('FOO: bar')
  })

  it('updates a workspace specific env file if the workspace flag is provided', async () => {
    await fs.writeFile(path.join(rootDir, 'hereya.yaml'), 'project: test-project\n')
    const envFile = path.join(rootDir, 'hereyastaticenv', 'env.my-workspace.yaml')
    await fs.mkdir(path.dirname(envFile), {recursive: true})
    await fs.writeFile(envFile, 'GOOD: baz\n')
    await runCommand(['env:set', "FOO", "-v", '"great value"', '--workspace', 'my-workspace'])
    const content = await fs.readFile(envFile, 'utf8')
    expect(content).to.contain('FOO: great value')
    expect(content).to.contain('GOOD: baz')
  })

})
