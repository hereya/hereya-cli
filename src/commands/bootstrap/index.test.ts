import { runCommand } from '@oclif/test';
import { expect } from 'chai'

describe('bootstrap', () => {
    it('rejects wrong infrastructure type', async () => {
        const { stderr } = await runCommand(['bootstrap', 'fake'])
        expect(stderr).to.contain('Infrastructure type fake is not supported yet!')
    })
})
