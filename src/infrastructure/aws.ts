import { BatchGetBuildsCommand, Build, CodeBuildClient, StartBuildCommand } from '@aws-sdk/client-codebuild';
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { DeleteParameterCommand, GetParameterCommand, PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { glob } from 'glob';
import ignore from 'ignore';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { IacType } from '../iac/common.js';
import { fileExists, getAnyPath } from '../lib/filesystem.js';
import { runShell } from '../lib/shell.js';
import {
    BootstrapInput,
    DeployInput,
    DeployOutput,
    DestroyInput,
    DestroyOutput,
    Infrastructure,
    InfrastructureType,
    ProvisionInput,
    ProvisionOutput,
    ResolveEnvInput,
    ResolveEnvOutput,
    SaveEnvInput,
    SaveEnvOutput,
    UndeployInput,
    UndeployOutput
} from './common.js';
import { provisionPackage } from './index.js';

export class AwsInfrastructure implements Infrastructure {
    async bootstrap(_: BootstrapInput): Promise<void> {
        const stsClient = new STSClient({});
        const { Account: accountId } = await stsClient.send(new GetCallerIdentityCommand({}));
        const region = process.env.AWS_REGION;

        runShell('npx', ['cdk', 'bootstrap', `aws://${accountId}/${region}`])

        const bootstrapPackage = 'hereya/bootstrap-aws-stack';

        const output = await provisionPackage({ package: bootstrapPackage });
        if (!output.success) {
            throw new Error(output.reason);
        }

        const { env } = output;
        const key = '/hereya-bootstrap/config';
        const ssmClient = new SSMClient({});
        const value = JSON.stringify(env);
        await ssmClient.send(new PutParameterCommand({
            Name: key,
            Overwrite: true,
            Type: 'String',
            Value: value
        }));

    }

    async deploy(input: DeployInput): Promise<DeployOutput> {
        let files: string[] = [];
        let s3Bucket = '';
        let s3Client = new S3Client({});
        let s3Key = '';

        try {
            ({ files, s3Bucket, s3Client, s3Key } = await this.uploadProjectFiles(input));
            input.parameters = {
                ...input.parameters,
                hereyaProjectEnv: JSON.stringify(input.projectEnv ?? {}),
            }
            const output = await this.runCodeBuild({
                ...input,
                deploy: true,
                sourceS3Key: s3Key
            });
            if (!output.success) {
                return output;
            }

            const env = await this.getEnv(input.id);

            return { env, success: true };
        } finally {
            if (s3Key && files.length > 0) {
                await s3Client.send(new DeleteObjectsCommand({
                    Bucket: s3Bucket,
                    Delete: {
                        Objects: files.map(file => ({ Key: `${s3Key}/${file}` }))
                    }
                }))
            }
        }
    }

    async destroy(input: DestroyInput): Promise<DestroyOutput> {
        const env = await this.getEnv(input.id);
        const output = await this.runCodeBuild({ ...input, destroy: true });
        if (!output.success) {
            return output;
        }

        await this.removeEnv(input.id);

        return { env, success: true };
    }

    async provision(input: ProvisionInput): Promise<ProvisionOutput> {
        const output = await this.runCodeBuild(input);
        if (!output.success) {
            return output;
        }

        const env = await this.getEnv(input.id);

        return { env, success: true };
    }

    async resolveEnv(input: ResolveEnvInput): Promise<ResolveEnvOutput> {
        const parameterStoreArnPattern = /^arn:aws:ssm:[\da-z-]+:\d{12}:parameter\/[\w./-]+$/;
        const ssmClient = new SSMClient({});
        if (parameterStoreArnPattern.test(input.value)) {
            const response = await ssmClient.send(new GetParameterCommand({
                Name: input.value,
                WithDecryption: true,
            }));
            return {
                isSecret: response.Parameter?.Type === 'SecureString',
                value: response.Parameter?.Value ?? input.value
            };
        }

        return { value: input.value };
    }

    async saveEnv(input: SaveEnvInput): Promise<SaveEnvOutput> {
        const key = `/hereya/${input.id}`;
        const ssmClient = new SSMClient({});
        const value = JSON.stringify(input.env);

        try {
            await ssmClient.send(new PutParameterCommand({
                Name: key,
                Overwrite: true,
                Type: 'String',
                Value: value
            }));
            return { success: true };
        } catch (error: any) {
            return { reason: error.message, success: false };
        }
    }

    async undeploy(input: UndeployInput): Promise<UndeployOutput> {
        let files: string[] = [];
        let s3Bucket = '';
        let s3Client = new S3Client({});
        let s3Key = '';

        let env: { [key: string]: string } = {};
        try {
            env = await this.getEnv(input.id);
        } catch (error: any) {
            console.log(`Could not get env for ${input.id}: ${error.message}. Continuing with undeployment...`);
        }

        try {

            ({ files, s3Bucket, s3Client, s3Key } = await this.uploadProjectFiles(input));
            input.parameters = {
                ...input.parameters,
                hereyaProjectEnv: JSON.stringify(input.projectEnv ?? {}),
            }
            const output = await this.runCodeBuild({
                ...input,
                deploy: true,
                destroy: true,
                sourceS3Key: s3Key
            });
            if (!output.success) {
                return output;
            }

            return { env, success: true };
        } finally {
            if (s3Key && files.length > 0) {
                await s3Client.send(new DeleteObjectsCommand({
                    Bucket: s3Bucket,
                    Delete: {
                        Objects: files.map(file => ({ Key: `${s3Key}/${file}` }))
                    }
                }))
            }
        }

    }

    private async getEnv(id: string): Promise<{ [key: string]: string }> {
        const ssmClient = new SSMClient({});
        const ssmParameterName = `/hereya/${id}`;
        try {
            const ssmParameter = await ssmClient.send(new GetParameterCommand({
                Name: ssmParameterName,
            }));
            return JSON.parse(ssmParameter.Parameter?.Value ?? '{}');
        } catch (error: any) {
            if (error.name === "ParameterNotFound") {
                console.debug(`Parameter "${ssmParameterName}" does not exist.`);

                return {};
            }

            throw error;

        }
    }


    private async getFilesToUpload(rootDir: string): Promise<string[]> {
        const ig = ignore.default();
        const ignoreFilePath = await getAnyPath(`${rootDir}/.hereyaignore`, `${rootDir}/.gitignore`);
        if (await fileExists(ignoreFilePath)) {
            const ignoreFileContent = await fs.readFile(ignoreFilePath, 'utf8');
            ig.add(ignoreFileContent);
        }

        const files = glob.sync('**/*', { cwd: rootDir, nodir: true });
        return files.filter(file => !ig.ignores(file));
    }

    private async removeEnv(id: string): Promise<void> {
        const ssmClient = new SSMClient({});
        const ssmParameterName = `/hereya/${id}`;
        await ssmClient.send(new DeleteParameterCommand({
            Name: ssmParameterName,
        }));
    }

    private async runCodeBuild(input: ({
        deploy?: false
    } | { deploy: true, sourceS3Key: string }) & { destroy?: boolean } & ProvisionInput): Promise<{
        reason: string;
        success: false
    } | { success: true }> {
        const codebuildClient = new CodeBuildClient({})
        let codebuildProjectName = '';
        switch (input.iacType) {
            case IacType.cdk: {
                codebuildProjectName = 'hereyaCdk';
                break;
            }

            case IacType.terraform: {
                codebuildProjectName = 'hereyaTerraform';
                break;
            }

            default: {
                return { reason: `IAC type ${input.iacType} is not supported yet!`, success: false };
            }
        }

        const ssmClient = new SSMClient({});
        const parameterName = `/hereya/package-parameters/${input.id}`;
        await ssmClient.send(new PutParameterCommand({
            Name: parameterName,
            Overwrite: true,
            Type: 'SecureString',
            Value: Object.entries(input.parameters ?? {}).map(([key, value]) => `${key}=${value}`).join(','),

        }))

        const response = await codebuildClient.send(new StartBuildCommand({
            environmentVariablesOverride: [
                {
                    name: 'HEREYA_ID',
                    type: 'PLAINTEXT',
                    value: input.id,
                },
                {
                    name: 'HEREYA_IAC_TYPE',
                    type: 'PLAINTEXT',
                    value: input.iacType,
                },
                {
                    name: 'HEREYA_INFRA_TYPE',
                    type: 'PLAINTEXT',
                    value: InfrastructureType.aws,
                },
                {
                    name: 'HEREYA_PARAMETERS',
                    type: 'PARAMETER_STORE',
                    value: parameterName,
                },
                {
                    name: 'HEREYA_WORKSPACE_ENV',
                    type: 'PLAINTEXT',
                    value: Object.entries(input.env ?? {}).map(([key, value]) => `${key}=${value}`).join(','),
                },
                {
                    name: 'PKG_REPO_URL',
                    type: 'PLAINTEXT',
                    value: input.pkgUrl,
                },
                {
                    name: 'HEREYA_DESTROY',
                    type: 'PLAINTEXT',
                    value: input.destroy ? 'true' : '',
                },
                {
                    name: 'HEREYA_DEPLOY',
                    type: 'PLAINTEXT',
                    value: input.deploy ? 'true' : '',
                },
                {
                    name: 'HEREYA_PROJECT_S3_KEY',
                    type: 'PLAINTEXT',
                    value: input.deploy ? input.sourceS3Key : '',
                }
            ],
            projectName: codebuildProjectName,
        }));
        console.log(`Deployment ${response.build?.id} started successfully.`)
        const command = new BatchGetBuildsCommand({
            ids: [response.build?.id ?? ''],
        });

        const deploymentResult = await new Promise<Build | undefined>((resolve) => {
            const handle = setInterval(async () => {
                const buildResponse = await codebuildClient.send(command)
                const build = buildResponse.builds?.[0]

                if (build?.buildStatus === 'IN_PROGRESS') {
                    console.log(`Deployment ${response.build?.id} still in progress...`)
                    return
                }

                clearInterval(handle)
                console.log(`Deployment ${response.build?.id} finished with status ${build?.buildStatus}.`)
                resolve(build)
            }, 10_000) // 10 seconds
        });
        if (deploymentResult?.buildStatus !== 'SUCCEEDED') {
            return { reason: `Deployment failed with status ${deploymentResult?.buildStatus}`, success: false };
        }

        // remove the parameter
        await ssmClient.send(new DeleteParameterCommand({
            Name: parameterName,
        }));

        return { success: true };
    }

    private async uploadProjectFiles(input: {
        projectEnv: { [p: string]: string };
        projectRootDir: string
    } & ProvisionInput) {
        const key = '/hereya-bootstrap/config';
        const ssmClient = new SSMClient({});
        const response = await ssmClient.send(new GetParameterCommand({
            Name: key,
        }));
        const bootstrapConfig = JSON.parse(response.Parameter?.Value ?? '{}');
        if (!bootstrapConfig.hereyaSourceCodeBucketName) {
            throw new Error('hereyaSourceCodeBucketName not found in bootstrap config');
        }

        const s3Key = `${input.id}/${randomUUID()}`;
        const s3Bucket = bootstrapConfig.hereyaSourceCodeBucketName;
        const files = await this.getFilesToUpload(input.projectRootDir);
        const s3Client = new S3Client({});
        await Promise.all(files.map(async (file) => {
            console.log(`Uploading ${file} to s3://${s3Bucket}/${s3Key}`);
            await s3Client.send(new PutObjectCommand({
                Body: await fs.readFile(path.join(input.projectRootDir, file)),
                Bucket: s3Bucket,
                Key: `${s3Key}/${file}`,
            }));
        }));
        return { files, s3Bucket, s3Client, s3Key };
    }

}
