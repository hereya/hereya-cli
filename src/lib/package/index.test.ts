import { expect, test } from '@oclif/test';
import { MockPackageManager } from './mock.js';
import { resolvePackage } from './index.js';

describe('package', () => {
    describe('resolvePackage', () => {
        const myTest = test.env({ USE_MOCK: 'true' });

        myTest
        .it('requires package name to be in the format owner/repository', async ctx => {
            const output = await resolvePackage({ package: 'invalid' })
            expect(output).to.have.property('found', false);
        });

        myTest
        .do(() => {
            MockPackageManager.getRepoContent.setMockedResponse({
                found: false,
                reason: 'not found'
            })
        })
        .it('requires package to have hereyarc file', async ctx => {
            const output = await resolvePackage({ package: 'owner/repo' })
            expect(output).to.have.property('found', false);
        });

        myTest
        .do((ctx) => {
            MockPackageManager.getRepoContent.setImplementation(async ({ path }) => {
                if (path === 'hereyarc.yaml') {
                    return {
                        found: true,
                        content: `
                        iac: terraform
                        infra: local
                        `
                    }
                }
                return {
                    found: false,
                    reason: 'not found'
                }
            })
        })
        .it(`works for yaml extensions`, async ctx => {
            const output = await resolvePackage({ package: 'org/myPkg' })
            expect(output).to.have.property('found', true);
            expect(output).to.deep.contain({
                packageUri: 'https://github.com/org/myPkg',
                canonicalName: 'org-myPkg',
                metadata: { iac: 'terraform', infra: 'local' }
            });
        })

        myTest
        .do((ctx) => {
            MockPackageManager.getRepoContent.setImplementation(async ({ path }) => {
                if (path === 'hereyarc.yml') {
                    return {
                        found: true,
                        content: `
                        iac: cdk
                        infra: aws
                        `
                    }
                }
                return {
                    found: false,
                    reason: 'not found'
                }
            })
        })
        .it(`works for yml extensions`, async ctx => {
            const output = await resolvePackage({ package: 'org/myPkg' })
            expect(output).to.have.property('found', true);
            expect(output).to.deep.contain({
                packageUri: 'https://github.com/org/myPkg',
                canonicalName: 'org-myPkg',
                metadata: { iac: 'cdk', infra: 'aws' }
            });
        })
    });
});
