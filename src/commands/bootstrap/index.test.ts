import { expect, test } from '@oclif/test'

describe('bootstrap', () => {
    test
    .stdout()
    .stderr()
    .command(['bootstrap', 'fake'])
    .it('reject wrong infrastructure type', ctx => {
        expect(ctx.stderr).to.contain('Infrastructure type fake is not supported yet!')
    })

})
