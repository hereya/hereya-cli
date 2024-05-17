import { expect, test } from '@oclif/test';

import { packageManager, resolvePackage } from './index.js';

describe('package', () => {
    describe('resolvePackage', () => {

        test
        .it('requires package name to be in the format owner/repository', async () => {
            const output = await resolvePackage({ package: 'invalid' })
            expect(output).to.have.property('found', false);
        });

        test
        .stub(
            packageManager, 'getRepoContent',
            stub => stub.resolves({
                found: false,
                reason: 'not found'
            })
        )
        .it('requires package to have hereyarc file', async _ => {
            const output = await resolvePackage({ package: 'owner/repo' })
            expect(output).to.have.property('found', false);
        });

        test
        .stub(
            packageManager, 'getRepoContent',
            stub => stub.callsFake(async ({ path }) => {
                if (path === 'hereyarc.yaml') {
                    return {
                        content: `
                        iac: terraform
                        infra: local
                        `,
                        found: true
                    }
                }

                return {
                    found: false,
                    reason: 'not found'
                }
            })
        )
        .it(`works for yaml extensions`, async _ => {
            const output = await resolvePackage({ package: 'org/myPkg' })
            expect(output).to.have.property('found', true);
            expect(output).to.deep.contain({
                canonicalName: 'org-myPkg',
                metadata: { iac: 'terraform', infra: 'local' },
                packageUri: 'https://github.com/org/myPkg'
            });
        })

        test
        .stub(
            packageManager, 'getRepoContent',
            stub => stub.callsFake(async ({ path }) => {
                if (path === 'hereyarc.yml') {
                    return {
                        content: `
                        iac: cdk
                        infra: aws
                        `,
                        found: true
                    }
                }

                return {
                    found: false,
                    reason: 'not found'
                }
            })
        )
        .it(`works for yml extensions`, async _ => {
            const output = await resolvePackage({ package: 'org/myPkg' })
            expect(output).to.have.property('found', true);
            expect(output).to.deep.contain({
                canonicalName: 'org-myPkg',
                metadata: { iac: 'cdk', infra: 'aws' },
                packageUri: 'https://github.com/org/myPkg'
            });
        })
    });
});
