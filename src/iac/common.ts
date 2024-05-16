export interface Iac {
    apply(input: ApplyInput): Promise<ApplyOutput>;

    destroy(input: DestroyInput): Promise<DestroyOutput>;
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

export type DestroyInput = ApplyInput;
export type DestroyOutput = ApplyOutput;
