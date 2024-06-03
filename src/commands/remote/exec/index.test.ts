import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import sinon, { SinonStub } from 'sinon';

import { cdk, terraform } from '../../../iac/index.js';
import { awsInfrastructure } from '../../../infrastructure/index.js';

describe('remote:exec', () => {
    let pkgPath: string

    beforeEach(async () => {
        pkgPath = path.join(os.tmpdir(), 'hereya-test-remote-exec', randomUUID())
    })

    afterEach(async () => {
        sinon.restore()
    });

    it('fails if HEREYA_ID is not set', async () => {
        process.env = {
            ...process.env,
            HEREYA_IAC_TYPE: 'terraform',
            HEREYA_INFRA_TYPE: 'aws',
            HEREYA_PARAMETERS: 'param1=value1,param2=value2',
            HEREYA_WORKSPACE_ENV: 'key1=value1,key2=value2',
        }
        const { error } = await runCommand(['remote:exec', pkgPath, '-o', path.join(pkgPath, 'output.yaml')])
        expect(error?.oclif?.exit).to.equal(2)
    });

    it('fails if HEREYA_IAC_TYPE is not set', async () => {
        process.env = {
            ...process.env,
            HEREYA_ID: 'test-id',
            HEREYA_INFRA_TYPE: 'aws',
            HEREYA_PARAMETERS: 'param1=value1,param2=value2',
        }
        const { error } = await runCommand(['remote:exec', pkgPath, '-o', path.join(pkgPath, 'output.yaml')])
        expect(error?.oclif?.exit).to.equal(2)
    });

    it('fails for unsupported IAC type', async () => {
        process.env = {
            ...process.env,
            HEREYA_IAC_TYPE: 'invalid',
            HEREYA_ID: 'test-id',
            HEREYA_INFRA_TYPE: 'aws',
            HEREYA_WORKSPACE_ENV: 'key1=value1,key2=value2',
        }
        const { error } = await runCommand(['remote:exec', pkgPath, '-o', path.join(pkgPath, 'output.yaml')])
        expect(error?.oclif?.exit).to.equal(2)
    });

    it('applies the package', async () => {
        process.env = {
            ...process.env,
            HEREYA_IAC_TYPE: 'terraform',
            HEREYA_ID: 'test-id',
            HEREYA_INFRA_TYPE: 'aws',
            HEREYA_PARAMETERS: 'param1=value1,param2=value2',
            HEREYA_WORKSPACE_ENV: 'key1=value1,key2=value2',
        }
        sinon.stub(terraform, 'apply').resolves({ env: { keyA1: 'valueA1', keyA2: 'valueA2' }, success: true })
        sinon.stub(awsInfrastructure, 'saveEnv').resolves({ success: true })

        await runCommand(['remote:exec', pkgPath, '-o', path.join(pkgPath, 'output.yaml')])

        sinon.assert.calledWithMatch(terraform.apply as SinonStub, sinon.match({
            env: { key1: 'value1', key2: 'value2' },
            id: 'test-id',
            parameters: { param1: 'value1', param2: 'value2' },
            pkgPath
        }))
        sinon.assert.calledWithMatch(awsInfrastructure.saveEnv as SinonStub, sinon.match({
            env: { keyA1: 'valueA1', keyA2: 'valueA2' },
            id: 'test-id'
        }))
    })

    it('destroys the package', async () => {
        process.env = {
            ...process.env,
            HEREYA_DESTROY: 'true',
            HEREYA_IAC_TYPE: 'cdk',
            HEREYA_ID: 'test-id',
            HEREYA_INFRA_TYPE: 'aws',
            HEREYA_WORKSPACE_ENV: 'key1=value1,key2=value2',
        }
        sinon.stub(cdk, 'destroy').resolves({ env: { keyD1: 'valueD1', keyD2: 'valueD2' }, success: true })
        sinon.stub(awsInfrastructure, 'saveEnv').resolves({ success: true })

        await runCommand(['remote:exec', pkgPath, '-o', path.join(pkgPath, 'output.yaml')])

        sinon.assert.calledWithMatch(cdk.destroy as SinonStub, sinon.match({
            env: { key1: 'value1', key2: 'value2' },
            id: 'test-id',
            parameters: {},
            pkgPath
        }))
        sinon.assert.calledWithMatch(awsInfrastructure.saveEnv as SinonStub, sinon.match({
            env: { keyD1: 'valueD1', keyD2: 'valueD2' },
            id: 'test-id'
        }))
    })
})
