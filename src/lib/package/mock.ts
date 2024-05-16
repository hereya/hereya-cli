import { GetRepoContentInput, GetRepoContentOutput, PackageManager } from './common.js';

export class MockPackageManager implements PackageManager {
    static getRepoContent = {
        fn: undefined as ((input: GetRepoContentInput) => Promise<GetRepoContentOutput>) | undefined,
        setImplementation(fn: (input: GetRepoContentInput) => Promise<GetRepoContentOutput>) {
            this.fn = fn
        },
        mockedResponse: {
            found: true,
            content: `
            iac: terraform
            infra: local
            `
        } as GetRepoContentOutput,
        setMockedResponse(response: GetRepoContentOutput) {
            this.mockedResponse = response
        },
        execute(input: GetRepoContentInput) {
            if (this.fn) return this.fn(input)
            return Promise.resolve(this.mockedResponse)
        }
    }

    async getRepoContent({ owner, repo, path }: GetRepoContentInput): Promise<GetRepoContentOutput> {
        return MockPackageManager.getRepoContent.execute({ owner, repo, path })
    }
}
