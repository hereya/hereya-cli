import { ApplyInput, ApplyOutput, DestroyInput, DestroyOutput, Iac } from './common.js';

export class Cdk implements Iac {
    apply(_: ApplyInput): Promise<ApplyOutput> {
        throw new Error('Method not implemented.');
    }

    destroy(_: DestroyInput): Promise<DestroyOutput> {
        throw new Error('Method not implemented.');
    }

}
