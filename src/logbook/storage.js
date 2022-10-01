const { IndexedDBInterface } = await import('../idb.js');

// db_key_settings uses a UUID, but this must be constant,
// not generated each time the system is loaded.
export const db_key_settings = 'settings-6c32f9d6-796c-4588-8a4b-35165a13d14d';

// db_key_recents uses a UUID, but this must be constant,
// not generated each time the system is loaded.
export const db_key_recents = 'recents-40c4dfe4-2aa5-4ac9-9143-80c93b7e0ed8';

export const storage_db = new IndexedDBInterface();
