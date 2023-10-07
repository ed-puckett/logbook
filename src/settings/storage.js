import {
    IndexedDBInterface,
} from '../../lib/sys/idb.js';


export const db_key_settings = 'settings';
export const db_key_themes   = 'themes';
export const db_key_recents  = 'recents';

// database_name and database_store_name use UUIDs, but these must be constant,
// not generated each time the system is loaded.
export const database_name       = 'settings-database-55e2b166-93eb-4ff8-8ef2-ddb31295efbf';
export const database_store_name = 'settings-database-store-55e2b166-93eb-4ff8-8ef2-ddb31295efbf';

export const storage_db = new IndexedDBInterface(database_name, database_store_name);
