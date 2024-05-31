import { CloudFormationClient, DescribeStacksCommand, Stack } from '@aws-sdk/client-cloudformation';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { runShell } from '../lib/shell.js';
import { load } from '../lib/yaml-utils.js';
import { ApplyInput, ApplyOutput, DestroyInput, DestroyOutput, Iac } from './common.js';

export class Cdk implements Iac {
    async apply(input: ApplyInput): Promise<ApplyOutput> {
        try {
            const {
                serializedContext,
                serializedParameters,
                serializedWorkspaceEnv
            } = await this.serializedParametersAndContext(input)
            runShell(
                'npx',
                [
                    'cdk', 'deploy', '--require-approval', 'never', ...serializedWorkspaceEnv, ...serializedParameters, ...serializedContext,
                ],
                {
                    directory: input.pkgPath,
                    env: { STACK_NAME: input.id },
                },
            )
            const env = await this.getEnv(input.id)

            return { env, success: true }
        } catch (error: any) {
            return { reason: error.message, success: false }
        }
    }

    async destroy(input: DestroyInput): Promise<DestroyOutput> {
        try {
            const env = await this.getEnv(input.id)
            const {
                serializedContext,
                serializedParameters,
                serializedWorkspaceEnv
            } = await this.serializedParametersAndContext(input)
            runShell(
                'npx',
                [
                    'cdk', 'destroy', '--force', ...serializedWorkspaceEnv, ...serializedParameters, ...serializedContext
                ],
                {
                    directory: input.pkgPath,
                    env: { STACK_NAME: input.id }
                },
            )
            return { env, success: true }
        } catch (error: any) {
            return { reason: error.message, success: false }
        }
    }

    private async getEnv(stackName: string) {
        const stack = await this.getStack(stackName)
        const env: { [key: string]: string } = {}
        for (const output of stack?.Outputs?.filter(output => output.OutputKey) ?? []) {
            env[output.OutputKey!] = output.OutputValue!
        }

        return env
    }

    private async getParameterNames(input: ApplyInput) {
        const workDir = input.pkgPath
        const serializedContext = Object.entries({
            ...input.env,
            ...input.parameters,
        }).flatMap(([key, value]) => ['--context', `${key}=${value}`])

        runShell('npm', ['install'], { directory: workDir })
        const result = runShell(
            'npx',
            [
                'cdk', 'synth', ...serializedContext,
            ],
            {
                directory: workDir,
                stdio: 'pipe'
            },
        )
        const stackYamlPath = path.join(workDir, '.stack.yaml')
        writeFileSync(stackYamlPath, result.stdout)
        const { data: synthedStack } = await load<{ Parameters: { [k: string]: any } }>(stackYamlPath)
        return Object.keys(synthedStack.Parameters)
    }

    private async getStack(stackName: string) {
        const cfnClient = new CloudFormationClient({})
        let stack: Stack | undefined
        try {
            const response = await cfnClient.send(new DescribeStacksCommand({
                StackName: stackName,
            }))
            stack = response.Stacks?.[0]
        } catch (error: any) {
            if (error.name === 'ValidationError') {
                return null
            }

            throw error
        }

        if (!stack) {
            return null
        }

        return stack
    }

    private async serializedParametersAndContext(input: ApplyInput) {
        const parameterNames = await this.getParameterNames(input)
        const serializedParameters = Object.entries(input.parameters ?? {})
        .filter(([key]) => parameterNames.includes(key))
        .flatMap(([key, value]) => ['--parameters', `${key}=${value}`])
        const serializedWorkspaceEnv = Object.entries(input.env)
        .filter(([key]) => parameterNames.includes(key))
        .flatMap(([key, value]) => ['--parameters', `${key}=${value}`])

        const serializedContext = Object.entries(
            {
                ...input.env,
                ...input.parameters,
            }
        ).filter(([key]) => !parameterNames.includes(key))
        .flatMap(([key, value]) => ['--context', `${key}=${value}`])

        return { serializedContext, serializedParameters, serializedWorkspaceEnv }
    }


}
