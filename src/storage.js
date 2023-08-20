import {
    IndexedDBInterface,
} from '../lib/sys/idb.js';


// db_key_settings uses a UUID, but this must be constant,
// not generated each time the system is loaded.
export const db_key_settings = 'settings-62176253-7df2-4d6a-9cad-f9c322dc0706';

// db_key_recents uses a UUID, but this must be constant,
// not generated each time the system is loaded.
export const db_key_recents = 'recents-4a7e72f9-9314-4563-9616-083fc2d20aa8';

export const storage_db = new IndexedDBInterface();  // using default database_name and database_store_name
