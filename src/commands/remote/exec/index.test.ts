import { expect, test } from '@oclif/test';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sinon, { SinonStub } from 'sinon';

import { cdk, terraform } from '../../../iac/index.js';

describe('remote:exec', () => {
    const pkgPath = path.join(os.tmpdir(), 'hereya-test-remote-exec', randomUUID())

    test
    .env({
        HEREYA_IAC_TYPE: 'terraform',
        HEREYA_PARAMETERS: 'param1=value1,param2=value2',
        HEREYA_WORKSPACE_ENV: 'key1=value1,key2=value2',
    })
    .command(['remote:exec', pkgPath, '-o', path.join(pkgPath, 'output.yaml')])
    .exit(2)
    .it('fails if HEREYA_ID is not set')

    test
    .env({
        HEREYA_ID: 'test-id',
        HEREYA_PARAMETERS: 'param1=value1,param2=value2',
    })
    .command(['remote:exec', pkgPath, '-o', path.join(pkgPath, 'output.yaml')])
    .exit(2)
    .it('fails if HEREYA_IAC_TYPE is not set')

    test
    .env({
        HEREYA_IAC_TYPE: 'invalid',
        HEREYA_ID: 'test-id',
        HEREYA_WORKSPACE_ENV: 'key1=value1,key2=value2',
    })
    .command(['remote:exec', pkgPath, '-o', path.join(pkgPath, 'output.yaml')])
    .exit(2)
    .it('fails for unsupported IAC type')

    test
    .env({
        HEREYA_IAC_TYPE: 'terraform',
        HEREYA_ID: 'test-id',
        HEREYA_PARAMETERS: 'param1=value1,param2=value2',
        HEREYA_WORKSPACE_ENV: 'key1=value1,key2=value2',
    })
    .stub(terraform, 'apply', stub => stub.resolves({ env: { keyA1: 'valueA1', keyA2: 'valueA2' }, success: true }))
    .command(['remote:exec', pkgPath, '-o', path.join(pkgPath, 'output.yaml')])
    .it('applies the package', async () => {
        sinon.assert.calledWithMatch(terraform.apply as SinonStub, sinon.match({
            env: { key1: 'value1', key2: 'value2' },
            id: 'test-id',
            parameters: { param1: 'value1', param2: 'value2' },
            pkgPath
        }))
        const outputContent = await fs.readFile(path.join(pkgPath, 'output.yaml'), 'utf8')
        expect(outputContent).to.contain('keyA1: valueA1')
        expect(outputContent).to.contain('keyA2: valueA2')
    })

    test
    .env({
        HEREYA_DESTROY: 'true',
        HEREYA_IAC_TYPE: 'cdk',
        HEREYA_ID: 'test-id',
        HEREYA_WORKSPACE_ENV: 'key1=value1,key2=value2',
    })
    .stub(cdk, 'destroy', stub => stub.resolves({ env: { keyD1: 'valueD1', keyD2: 'valueD2' }, success: true }))
    .command(['remote:exec', pkgPath, '-o', path.join(pkgPath, 'output.yaml')])
    .it('destroys the package', async () => {
        sinon.assert.calledWithMatch(cdk.destroy as SinonStub, sinon.match({
            env: { key1: 'value1', key2: 'value2' },
            id: 'test-id',
            parameters: {},
            pkgPath
        }))
        const outputContent = await fs.readFile(path.join(pkgPath, 'output.yaml'), 'utf8')
        expect(outputContent).to.contain('keyD1: valueD1')
        expect(outputContent).to.contain('keyD2: valueD2')
    })

})
