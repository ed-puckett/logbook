import {
    IndexedDBInterface,
} from '../../lib/sys/idb.js';


export const db_key_settings = 'settings';
export const db_key_themes   = 'themes';
export const db_key_recents  = 'recents';

// database_name and database_store_name use UUIDs, but these must be constant,
// not generated each time the system is loaded.
export const database_name       = 'settings-database-ecb33c0d-38c8-4b90-8b51-0054fab62f2f';
export const database_store_name = 'settings-database-store-ecb33c0d-38c8-4b90-8b51-0054fab62f2f';

export const storage_db = new IndexedDBInterface(database_name, database_store_name);
