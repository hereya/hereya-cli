import { Cdk } from './cdk.js';
import { Iac, IacType } from './common.js';
import { Terraform } from './terraform.js';

export const terraform = new Terraform();
export const cdk = new Cdk();

export function getIac({ type }: GetIacInput): GetIacOutput {
    switch (type) {
        case IacType.terraform: {
            return { iac: terraform, supported: true }
        }

        case IacType.cdk: {
            return { iac: cdk, supported: true }
        }

        default: {
            return { reason: `Iac type ${type} is not supported yet!`, supported: false }
        }
    }
}

export type GetIacInput = {
    type: IacType;
}

export type GetIacOutput = {
    iac: Iac;
    supported: true;
} | {
    reason: string;
    supported: false;
}
