import { LocalInfrastructure } from './local.js';
import { Infrastructure, InfrastructureType } from './common.js';

export async function getInfrastructure(input: GetInfrastructureInput): Promise<GetInfrastructureOutput> {
    switch (input.type) {
        case InfrastructureType.local:
            return {
                supported: true,
                infrastructure: new LocalInfrastructure()
            }
        default:
            return {
                supported: false,
                reason: `Infrastructure type ${input.type} is not supported yet!`
            }
    }
}

export type GetInfrastructureInput = {
    type: InfrastructureType
}

export type GetInfrastructureOutput = { supported: true, infrastructure: Infrastructure } | {
    supported: false,
    reason: string
}

