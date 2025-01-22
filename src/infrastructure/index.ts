import { z } from 'zod'

import { getBackend } from '../backend/index.js'
import { PackageMetadata, resolvePackage } from '../lib/package/index.js'
import { AwsInfrastructure } from './aws.js'
import { Infrastructure, InfrastructureType } from './common.js'
import { LocalInfrastructure } from './local.js'

export const localInfrastructure = new LocalInfrastructure()
export const awsInfrastructure = new AwsInfrastructure()

export function getInfrastructure(input: GetInfrastructureInput): GetInfrastructureOutput {
  switch (input.type) {
    case InfrastructureType.local: {
      return {
        infrastructure: localInfrastructure,
        supported: true,
      }
    }

    case InfrastructureType.aws: {
      return {
        infrastructure: awsInfrastructure,
        supported: true,
      }
    }

    default: {
      return {
        reason: `Infrastructure type ${input.type} is not supported yet!`,
        supported: false,
      }
    }
  }
}

export async function destroyPackage(input: DestroyPackageInput): Promise<DestroyPackageOutput> {
  const resolvePackageOutput = await resolvePackage({isDeploying: input.isDeploying, package: input.package})
  if (!resolvePackageOutput.found) {
    return {reason: resolvePackageOutput.reason, success: false}
  }

  const {canonicalName, metadata, packageUri, pkgName} = resolvePackageOutput
  const infrastructure$ = getInfrastructure({type: metadata.infra})
  if (!infrastructure$.supported) {
    return {reason: infrastructure$.reason, success: false}
  }

  if (metadata.deploy && input.skipDeploy) {
    return {env: {}, metadata, success: true}
  }

  const {infrastructure} = infrastructure$
  const backend = await getBackend()
  const id$ = await backend.getProvisioningId({
    packageCanonicalName: canonicalName,
    project: input.project,
    workspace: input.workspace,
  })
  if (!id$.success) {
    return {reason: id$.reason, success: false}
  }

  const {id} = id$
  const destroyOutput = metadata.deploy
    ? await infrastructure.undeploy({
        canonicalName,
        env: input.env,
        iacType: metadata.iac,
        id,
        parameters: input.parameters,
        pkgName,
        pkgUrl: packageUri,
        projectEnv: input.projectEnv ?? {},
        projectRootDir: input.projectRootDir!,
      })
    : await infrastructure.destroy({
        canonicalName,
        env: input.env,
        iacType: metadata.iac,
        id,
        parameters: input.parameters,
        pkgName,
        pkgUrl: packageUri,
      })
  if (!destroyOutput.success) {
    return {reason: destroyOutput.reason, success: false}
  }

  const dependencies = metadata.dependencies ?? {}
  const depsOutput = await Promise.all(
    Object.entries(dependencies).map(async ([depName]) =>
      destroyPackage({
        ...input,
        package: depName,
      }),
    ),
  )

  if (!depsOutput.every((output) => output.success)) {
    return {
      reason: `Failed to destroy all dependencies: ${depsOutput
        .filter((o) => !o.success)
        .map((o) => !o.success && o.reason)}`,
      success: false,
    }
  }

  return {env: destroyOutput.env, metadata, success: true}
}

export async function provisionPackage(input: ProvisionPackageInput): Promise<ProvisionPackageOutput> {
  const resolvePackageOutput = await resolvePackage({isDeploying: input.isDeploying, package: input.package})
  if (!resolvePackageOutput.found) {
    return {reason: resolvePackageOutput.reason, success: false}
  }

  const {canonicalName, metadata, packageUri, pkgName} = resolvePackageOutput

  const infrastructure$ = getInfrastructure({type: metadata.infra})
  if (!infrastructure$.supported) {
    return {reason: infrastructure$.reason, success: false}
  }

  if (metadata.deploy && input.skipDeploy) {
    return {env: {}, metadata, success: true}
  }

  const dependencies = metadata.dependencies ?? {}
  const depsOutput = await Promise.all(
    Object.entries(dependencies).map(async ([depName]) =>
      provisionPackage({
        ...input,
        package: depName,
      }),
    ),
  )

  if (!depsOutput.every((output) => output.success)) {
    return {
      reason: `Failed to provision all dependencies: ${depsOutput
        .filter((o) => !o.success)
        .map((o) => !o.success && o.reason)}`,
      success: false,
    }
  }

  let depsEnv = {}
  for (const output of depsOutput) {
    if (output.success) {
      depsEnv = {...depsEnv, ...output.env}
    } else {
      return {reason: (output as any).reason, success: false}
    }
  }

  const {infrastructure} = infrastructure$
  const backend = await getBackend()
  const id$ = await backend.getProvisioningId({
    packageCanonicalName: canonicalName,
    project: input.project,
    workspace: input.workspace,
  })
  if (!id$.success) {
    return {reason: id$.reason, success: false}
  }

  const {id} = id$

  const provisionOutput = metadata.deploy
    ? await infrastructure.deploy({
        canonicalName,
        env: {...input.env, ...depsEnv},
        iacType: metadata.iac,
        id,
        parameters: input.parameters,
        pkgName,
        pkgUrl: packageUri,
        projectEnv: input.projectEnv ?? {},
        projectRootDir: input.projectRootDir!,
      })
    : await infrastructure.provision({
        canonicalName,
        env: input.env,
        iacType: metadata.iac,
        id,
        parameters: input.parameters,
        pkgName,
        pkgUrl: packageUri,
      })
  if (!provisionOutput.success) {
    return {reason: provisionOutput.reason, success: false}
  }

  return {env: provisionOutput.env, metadata, success: true}
}

export type DestroyPackageInput = ProvisionPackageInput

export type DestroyPackageOutput = ProvisionPackageOutput

export type ProvisionPackageInput = {
  env?: {[key: string]: string}
  isDeploying?: boolean
  package: string
  parameters?: {[key: string]: string}
  project?: string
  projectEnv?: {[key: string]: string}
  projectRootDir?: string
  skipDeploy?: boolean
  workspace?: string
}

export type ProvisionPackageOutput =
  | {
      env: {[key: string]: string}
      metadata: z.infer<typeof PackageMetadata>
      success: true
    }
  | {
      reason: string
      success: false
    }

export type GetInfrastructureInput = {
  type: InfrastructureType
}

export type GetInfrastructureOutput =
  | {
      reason: string
      supported: false
    }
  | {infrastructure: Infrastructure; supported: true}
