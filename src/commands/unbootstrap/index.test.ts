import { runCommand } from '@oclif/test'
import { expect } from 'chai'
import * as sinon from 'sinon'

import { awsInfrastructure, localInfrastructure } from '../../infrastructure/index.js';

describe('unbootstrap', () => {
    afterEach(() => {
        sinon.restore();
    });

    it('rejects wrong infrastructure type', async () => {
        const { stderr } = await runCommand(['unbootstrap', 'fake'])
        expect(stderr).to.contain('Infrastructure type fake is not supported yet!')
    })

    it('unbootstraps the right infrastructure', async () => {
        const localStub = sinon.stub(localInfrastructure, 'unbootstrap')
        const awsStub = sinon.stub(awsInfrastructure, 'unbootstrap')

        await runCommand(['unbootstrap', 'local'])

        sinon.assert.calledOnce(localStub)
        sinon.assert.notCalled(awsStub)
    })
})
