export interface PackageManager {
    getRepoContent: (input: GetRepoContentInput) => Promise<GetRepoContentOutput>
}

export type GetRepoContentInput = {
    owner: string
    path: string
    repo: string
}

export type GetRepoContentOutput = {
    content: string
    found: true
} | {
    found: false
    reason: string
}
