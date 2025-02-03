import {expect} from 'chai'
import sinon from 'sinon'

import {localPackageManager, packageManager, resolvePackage} from './index.js'

describe('package', () => {
  describe('resolvePackage', () => {
    afterEach(() => {
      sinon.restore()
    })

    it('accepts local packages with local:// prefix', async () => {
      sinon.stub(localPackageManager, 'getRepoContent').resolves({
        content: `
                iac: terraform
                infra: local
                `,
        found: true,
        pkgUrl: 'local://./my/local/pkg/path',
      })
      const output = await resolvePackage({package: 'local://my/local/pkg/path'})
      expect(output).to.have.property('found', true)
    })

    it('requires package name to be in the format owner/repository for non local packages', async () => {
      const output = await resolvePackage({package: 'invalid'})
      expect(output).to.have.property('found', false)
    })

    it('requires package to have hereyarc file', async () => {
      sinon.stub(packageManager, 'getRepoContent').resolves({
        found: false,
        reason: 'not found',
      })
      const output = await resolvePackage({package: 'owner/repo'})
      expect(output).to.have.property('found', false)
    })

    it(`works for yaml extensions`, async () => {
      sinon.stub(packageManager, 'getRepoContent').callsFake(async ({path}) => {
        if (path === 'hereyarc.yaml') {
          return {
            content: `
                        iac: terraform
                        infra: local
                        `,
            found: true,
            pkgUrl: 'https://github.com/org/myPkg',
          }
        }

        return {
          found: false,
          reason: 'not found',
        }
      })
      const output = await resolvePackage({package: 'org/myPkg'})
      expect(output).to.have.property('found', true)
      expect(output).to.deep.contain({
        canonicalName: 'org-myPkg',
        metadata: {iac: 'terraform', infra: 'local'},
        packageUri: 'https://github.com/org/myPkg',
      })
    })

    it('works for packages with onDeploy companion', async () => {
      sinon.stub(packageManager, 'getRepoContent').resolves({
        content: `
                iac: terraform
                infra: local
                onDeploy:
                  pkg: org/depPkg
                  version: 1.0.0
                `,
        found: true,
        pkgUrl: 'https://github.com/org/myPkg',
      })
      const output = await resolvePackage({package: 'org/myPkg'})
      expect(output).to.have.property('found', true)
      expect(output).to.deep.contain({
        canonicalName: 'org-myPkg',
        metadata: {
          iac: 'terraform',
          infra: 'local',
          onDeploy: {pkg: 'org/depPkg', version: '1.0.0'},
        },
        packageUri: 'https://github.com/org/myPkg',
      })
    })

    it('works for deploy packages having dependencies', async () => {
      sinon.stub(packageManager, 'getRepoContent').resolves({
        content: `
                iac: cdk
                infra: aws
                deploy: true
                dependencies:
                    dep1: 1.0.0
                    dep2: 2.0.0
                `,
        found: true,
        pkgUrl: 'https://github.com/org/myPkg',
      })
      const output = await resolvePackage({package: 'org/myPkg'})
      expect(output).to.have.property('found', true)
      expect(output).to.deep.contain({
        canonicalName: 'org-myPkg',
        metadata: {
          dependencies: {dep1: '1.0.0', dep2: '2.0.0'},
          deploy: true,
          iac: 'cdk',
          infra: 'aws',
        },
      })
    })

    it('should fail if a non deploy package have dependencies', async () => {
      sinon.stub(packageManager, 'getRepoContent').resolves({
        content: `
                iac: cdk
                infra: aws
                dependencies:
                    dep1: 1.0.0
                    dep2: 2.0.0
                `,
        found: true,
        pkgUrl: 'https://github.com/org/myPkg',
      })
      const output = await resolvePackage({package: 'org/myPkg'})
      expect(output).to.have.property('found', false)
    })

    it(`works for yml extensions`, async () => {
      sinon.stub(packageManager, 'getRepoContent').callsFake(async ({path}) => {
        if (path === 'hereyarc.yml') {
          return {
            content: `
                        iac: cdk
                        infra: aws
                        `,
            found: true,
            pkgUrl: 'https://github.com/org/myPkg',
          }
        }

        return {
          found: false,
          reason: 'not found',
        }
      })
      const output = await resolvePackage({package: 'org/myPkg'})
      expect(output).to.have.property('found', true)
      expect(output).to.deep.contain({
        canonicalName: 'org-myPkg',
        metadata: {iac: 'cdk', infra: 'aws'},
        packageUri: 'https://github.com/org/myPkg',
      })
    })
  })
})
