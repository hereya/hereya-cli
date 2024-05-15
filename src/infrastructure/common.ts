export enum InfrastructureType {
    local = 'local',
    aws = 'aws',
    azure = 'azure',
    gcp = 'gcp'
}

export interface Infrastructure {
    bootstrap(): Promise<void>;
}
