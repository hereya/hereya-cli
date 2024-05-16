import { ApplyInput, ApplyOutput, DestroyInput, DestroyOutput, Iac } from './common.js';

export class Cdk implements Iac {
    apply(input: ApplyInput): Promise<ApplyOutput> {
        throw new Error('Method not implemented.');
    }

    destroy(input: DestroyInput): Promise<DestroyOutput> {
        throw new Error('Method not implemented.');
    }

}
