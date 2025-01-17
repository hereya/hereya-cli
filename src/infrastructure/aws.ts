import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import { DeleteParameterCommand, GetParameterCommand, PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm'
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { getIac } from '../iac/index.js'
import { downloadPackage } from '../lib/package/index.js'
import { runShell } from '../lib/shell.js'
import {
  BootstrapInput,
  DeployInput,
  DeployOutput,
  DestroyInput,
  DestroyOutput,
  Infrastructure,
  ProvisionInput,
  ProvisionOutput,
  ResolveEnvInput,
  ResolveEnvOutput,
  SaveEnvInput,
  SaveEnvOutput,
  StoreEnvInput,
  StoreEnvOutput,
  UndeployInput,
  UndeployOutput,
  UnstoreEnvInput,
  UnstoreEnvOutput
} from './common.js'
import { destroyPackage, provisionPackage } from './index.js'

export class AwsInfrastructure implements Infrastructure {
  private configKey = '/hereya-bootstrap/config'

  async bootstrap(_: BootstrapInput): Promise<void> {
    const stsClient = new STSClient({})
    const {Account: accountId} = await stsClient.send(new GetCallerIdentityCommand({}))
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION

    runShell('npx', ['cdk', 'bootstrap', `aws://${accountId}/${region}`])

    const bootstrapPackage = 'hereya/bootstrap-aws-stack'

    const output = await provisionPackage({package: bootstrapPackage})
    if (!output.success) {
      throw new Error(output.reason)
    }

    const {env} = output
    const key = this.configKey
    const ssmClient = new SSMClient({})
    const value = JSON.stringify(env)
    await ssmClient.send(
      new PutParameterCommand({
        Name: key,
        Overwrite: true,
        Type: 'String',
        Value: value,
      }),
    )
  }

  async deploy(input: DeployInput): Promise<DeployOutput> {
    input.parameters = {
      ...input.parameters,
      hereyaProjectEnv: JSON.stringify(input.projectEnv ?? {}),
      hereyaProjectRootDir: input.projectRootDir,
    }
    return this.provision(input)
  }

  async destroy(input: DestroyInput): Promise<DestroyOutput> {
    const destPath = path.join(os.homedir(), '.hereya', input.id, input.canonicalName)
    const downloadPath = await downloadPackage(input.pkgUrl, destPath)
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION
    const infraConfig = {
      ...await this.getConfig(),
      region,
    }
    if (!infraConfig.terraformStateBucketName || !infraConfig.terraformStateLockTableName) {
      return {
        reason: 'could not find AWS infrastructure config. Did you run `hereya bootstrap aws`?',
        success: false,
      }
    }

    const iac$ = getIac({type: input.iacType})
    if (!iac$.supported) {
      return {reason: iac$.reason, success: false}
    }

    const {iac} = iac$

    const output = await iac.destroy({
      env: input.env ?? {},
      id: input.id,
      infraConfig,
      parameters: input.parameters,
      pkgPath: downloadPath,
    })
    if (!output.success) {
      return {reason: output.reason, success: false}
    }

    // Remove downloaded package
    await fs.rm(downloadPath, {recursive: true})

    return {env: output.env, success: true}
  }

  async provision(input: ProvisionInput): Promise<ProvisionOutput> {
    const destPath = path.join(os.homedir(), '.hereya', input.id, input.canonicalName)
    const downloadPath = await downloadPackage(input.pkgUrl, destPath)
    const config = await this.getConfig()
    const terraformStateBucketRegion = config.terraformStateBucketRegion || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION
    const infraConfig = {
      ...config,
      terraformStateBucketRegion,
    }
    if (!infraConfig.terraformStateBucketName || !infraConfig.terraformStateLockTableName) {
      return {
        reason: 'could not find AWS infrastructure config. Did you run `hereya bootstrap aws`?',
        success: false,
      }
    }

    const iac$ = getIac({type: input.iacType})
    if (!iac$.supported) {
      return {reason: iac$.reason, success: false}
    }

    const {iac} = iac$

    const output = await iac.apply({
      env: input.env ?? {},
      id: input.id,
      infraConfig,
      parameters: input.parameters,
      pkgPath: downloadPath,
    })
    if (!output.success) {
      return {reason: output.reason, success: false}
    }

    return {env: output.env, success: true}
  }

  async resolveEnv(input: ResolveEnvInput): Promise<ResolveEnvOutput> {
    try {
      const parameterStoreArnPattern = /^arn:aws:ssm:[\da-z-]+:\d{12}:parameter\/[\w./-]+$/
      const ssmClient = new SSMClient({})
      if (parameterStoreArnPattern.test(input.value)) {
        const response = await ssmClient.send(
          new GetParameterCommand({
            Name: input.value,
            WithDecryption: true,
          }),
        )
        return {
          isSecret: response.Parameter?.Type === 'SecureString',
          value: response.Parameter?.Value ?? input.value,
        }
      }

      const secretManagerArnPattern = /^arn:aws:secretsmanager:[\da-z-]+:\d{12}:secret:[\w-]+/
      const secretManagerClient = new SecretsManagerClient({})
      if (secretManagerArnPattern.test(input.value)) {
        const response = await secretManagerClient.send(
          new GetSecretValueCommand({
            SecretId: input.value,
          }),
        )
        return {
          isSecret: true,
          value: response.SecretString ?? input.value,
        }
      }

      return {value: input.value}
    } catch (error: any) {
      console.warn(`Could not resolve value "${input.value}": ${error.message}. Will return the original value.`)
      return {value: input.value}
    }
  }

  async saveEnv(input: SaveEnvInput): Promise<SaveEnvOutput> {
    const key = `/hereya/${input.id}`
    const ssmClient = new SSMClient({})
    const value = JSON.stringify(input.env)

    try {
      await ssmClient.send(
        new PutParameterCommand({
          Name: key,
          Overwrite: true,
          Type: 'String',
          Value: value,
        }),
      )
      return {success: true}
    } catch (error: any) {
      return {reason: error.message, success: false}
    }
  }

  async storeEnv(input: StoreEnvInput): Promise<StoreEnvOutput> {
    if (!input.sensitive) {
      return {success: true, value: input.value}
    }

    const ssmClient = new SSMClient({})
    const id = randomUUID()
    const ssmParameterName = input.oldValue ?? `/hereya/${input.name}/${id}`
    await ssmClient.send(
      new PutParameterCommand({
        Name: ssmParameterName,
        Overwrite: true,
        Type: 'SecureString',
        Value: input.value,
      }),
    )

    const parameter = await ssmClient.send(
      new GetParameterCommand({
        Name: ssmParameterName,
      }),
    )

    if (!parameter.Parameter?.ARN) {
      throw new Error(`Could not store env var ${input.name} for AWS infrastructure`)
    }

    return {success: true, value: parameter.Parameter.ARN}
  }

  async unbootstrap(_: BootstrapInput): Promise<void> {
    const ssmClient = new SSMClient({})
    const key = '/hereya-bootstrap/config'
    try {
      await ssmClient.send(
        new DeleteParameterCommand({
          Name: key,
        }),
      )
    } catch (error: any) {
      console.log(`Could not delete parameter "${key}": ${error.message}. Continuing with unbootstrap...`)
    }

    const bootstrapPackage = 'hereya/bootstrap-aws-stack'
    const output = await destroyPackage({package: bootstrapPackage})
    if (!output.success) {
      throw new Error(output.reason)
    }
  }

  async undeploy(input: UndeployInput): Promise<UndeployOutput> {
    input.parameters = {
      ...input.parameters,
      hereyaProjectEnv: JSON.stringify(input.projectEnv ?? {}),
      hereyaProjectRootDir: input.projectRootDir,
    }
    return this.destroy(input)
  }

  async unstoreEnv(input: UnstoreEnvInput): Promise<UnstoreEnvOutput> {
    const parameterStoreArnPattern = /^arn:aws:ssm:[\da-z-]+:\d{12}:parameter\/[\w./-]+$/
    if (!parameterStoreArnPattern.test(input.value)) {
      return {success: true}
    }

    const ssmClient = new SSMClient({})
    const parameter = await ssmClient.send(
      new GetParameterCommand({
        Name: input.value,
      }),
    )
    const ssmParameterName = parameter.Parameter?.Name
    if (!ssmParameterName) {
      return {success: true}
    }

    await ssmClient.send(
      new DeleteParameterCommand({
        Name: ssmParameterName,
      }),
    )

    return {success: true}
  }

  private async getConfig(): Promise<{
    terraformStateBucketName: string
    terraformStateBucketRegion?: string
    terraformStateLockTableName: string
  }> {
    const ssmClient = new SSMClient({})
    const ssmParameter = await ssmClient.send(
      new GetParameterCommand({
        Name: this.configKey,
      }),
    )
    return JSON.parse(ssmParameter.Parameter?.Value ?? '{}')
  }
}
