export interface PackageManager {
    getRepoContent: (input: GetRepoContentInput) => Promise<GetRepoContentOutput>
}

export type GetRepoContentInput = {
    owner: string
    repo: string
    path: string
}

export type GetRepoContentOutput = {
    found: true
    content: string
} | {
    found: false
    reason: string
}
