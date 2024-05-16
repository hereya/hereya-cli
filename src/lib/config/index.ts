import { ConfigManager } from './common.js';
import { SimpleConfigManager } from './simple.js';


export const configManager: ConfigManager = new SimpleConfigManager()

export function getConfigManager(): ConfigManager {
    return configManager;
}
