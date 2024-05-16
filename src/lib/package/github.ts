import { Octokit } from '@octokit/rest';
import { GetRepoContentInput, GetRepoContentOutput, PackageManager } from './common.js';


export class GitHubPackageManager implements PackageManager {
    async getRepoContent({ owner, repo, path }: GetRepoContentInput): Promise<GetRepoContentOutput> {
        const octokit = new Octokit();
        try {
            const response = await octokit.rest.repos.getContent({
                owner,
                repo,
                path,
                headers: {
                    'Accept': 'application/vnd.github.raw+json'
                }
            });
            if (response.status !== 200) {
                return {
                    found: false,
                    reason: `Failed to fetch content: ${response.status}`
                }
            }

            return {
                found: true,
                content: response.data as unknown as string
            }
        } catch (error: any) {
            return {
                found: false,
                reason: error.message
            }
        }
    }
}
