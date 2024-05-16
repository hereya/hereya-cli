export interface Iac {
    apply(input: ApplyInput): Promise<ApplyOutput>;
}

export enum IacType {
    terraform = 'terraform',
    cdk = 'cdk',
}

export type ApplyInput = {
    env: { [key: string]: string };
    pkgPath: string;
}

export type ApplyOutput = {
    success: true;
    env: { [key: string]: string };
} | {
    success: false;
    reason: string;
}
