const { Subscribable } = await import('../../lib/sys/subscribable.js');

const {
    IndexedDBInterface,
} = await import('./idb.js');


const config_database_key = 'config';

const config_storage = new IndexedDBInterface();

export async function get_config(default_config=null) {
    if (default_config !== null && typeof default_config !== 'undefined' && typeof default_config !== 'object') {
        throw new Error('default_config must be null/undefined or an object');
    }
    const config_from_storage = await config_storage.get(config_database_key);
    if (config_from_storage) {
        return config_from_storage;
    } else {
        const config = default_config ?? {};
        await set_config(config);
        return config;
    }
}

export async function set_config(new_config) {
    if (typeof new_config !== 'object') {
        throw new Error('new_config must be an object');
    }
    await config_storage.put(config_database_key, new_config);
    config_updated_events.dispatch();
}

export const config_updated_events = new Subscribable();
