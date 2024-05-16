import { ApplyInput, ApplyOutput, Iac } from './common.js';

export class Cdk implements Iac {
    apply(input: ApplyInput): Promise<ApplyOutput> {
        throw new Error('Method not implemented.');
    }

}
