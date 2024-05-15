import { Infrastructure } from './common.js';

export class LocalInfrastructure implements Infrastructure {

    async bootstrap() {
        console.log('Bootstrapping local infrastructure');
    }
}
