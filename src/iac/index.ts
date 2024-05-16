import { Iac, IacType } from './common.js';
import { Terraform } from './terraform.js';
import { Cdk } from './cdk.js';

export function getIac({ type }: GetIacInput): GetIacOutput {
    switch (type) {
        case IacType.terraform:
            return { supported: true, iac: new Terraform() }
        case IacType.cdk:
            return { supported: true, iac: new Cdk() }
        default:
            return { supported: false, reason: `Iac type ${type} is not supported yet!` }
    }
}

export type GetIacInput = {
    type: IacType;
}

export type GetIacOutput = {
    supported: true;
    iac: Iac;
} | {
    supported: false;
    reason: string;
}
