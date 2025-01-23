export interface PackageManager {
    downloadPackage: (pkgUrl: string, destPath: string) => Promise<string>
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
    pkgUrl: string
} | {
    found: false
    reason: string
}
