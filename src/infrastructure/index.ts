import { Infrastructure, InfrastructureType } from './common.js';
import { LocalInfrastructure } from './local.js';

export async function getInfrastructure(input: GetInfrastructureInput): Promise<GetInfrastructureOutput> {
    switch (input.type) {
        case InfrastructureType.local: {
            return {
                infrastructure: new LocalInfrastructure(),
                supported: true
            }
        }

        default: {
            return {
                reason: `Infrastructure type ${input.type} is not supported yet!`,
                supported: false
            }
        }
    }
}

export type GetInfrastructureInput = {
    type: InfrastructureType
}

export type GetInfrastructureOutput = {
    reason: string
    supported: false,
} | { infrastructure: Infrastructure, supported: true }

