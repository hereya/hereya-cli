export interface Iac {
    apply(input: ApplyInput): Promise<ApplyOutput>;

    destroy(input: DestroyInput): Promise<DestroyOutput>;
}

export enum IacType {
    cdk = 'cdk',
    terraform = 'terraform',
}

export type ApplyInput = {
    env: { [key: string]: string };
    parameters?: { [key: string]: string };
    pkgPath: string;
}

export type ApplyOutput = {
    env: { [key: string]: string };
    success: true;
} | {
    reason: string;
    success: false;
}

export type DestroyInput = ApplyInput;
export type DestroyOutput = ApplyOutput;
