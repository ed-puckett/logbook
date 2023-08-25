import {
    IndexedDBInterface,
} from '../../lib/sys/idb.js';


export const db_key_settings = 'settings';
export const db_key_themes   = 'themes';
export const db_key_recents  = 'recents';

// database_name and database_store_name use UUIDs, but these must be constant,
// not generated each time the system is loaded.
export const database_name       = 'settings-database-ff44de09-85ad-4582-9a35-32f04ba5834f';
export const database_store_name = 'settings-database-store-ff44de09-85ad-4582-9a35-32f04ba5834f';

export const storage_db = new IndexedDBInterface(database_name, database_store_name);
