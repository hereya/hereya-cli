import { Octokit } from '@octokit/rest';

import type { GetRepoContentInput, GetRepoContentOutput, PackageManager } from './common.js';


export class GitHubPackageManager implements PackageManager {
    async getRepoContent({ owner, path, repo }: GetRepoContentInput): Promise<GetRepoContentOutput> {
        const octokit = new Octokit();
        try {
            const response = await octokit.rest.repos.getContent({
                headers: {
                    'Accept': 'application/vnd.github.raw+json'
                },
                owner,
                path,
                repo
            });

            if (response.status !== 200) {
                return {
                    found: false,
                    reason: `Failed to fetch content: ${response.status}`
                }
            }

            return {
                content: response.data as unknown as string,
                found: true
            }
        } catch (error: any) {
            return {
                found: false,
                reason: error.message
            }
        }
    }
}
