import { ConfigManager } from './common.js';
import { SimpleConfigManager } from './simple.js';

export function getConfigManager(): ConfigManager {
    return new SimpleConfigManager()
}
