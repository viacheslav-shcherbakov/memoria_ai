const DB_NAME = 'memoria-db';
const DB_VERSION = 2;
const STORE_NAME = 'memories';

const DB = {
    db: null,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;
                
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('date', 'date', { unique: false });
                    store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
                    store.createIndex('projectId', 'projectId', { unique: false });
                    store.createIndex('mood', 'mood', { unique: false });
                }

                // Upgrade from v1 to v2: add new indexes
                if (oldVersion < 2) {
                    const transaction = event.target.transaction;
                    const store = transaction.objectStore(STORE_NAME);
                    
                    if (!store.indexNames.contains('projectId')) {
                        store.createIndex('projectId', 'projectId', { unique: false });
                    }
                    if (!store.indexNames.contains('mood')) {
                        store.createIndex('mood', 'mood', { unique: false });
                    }
                }
            };
        });
    },

    async getAll() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    async get(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async add(memory) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.add(memory);

            request.onsuccess = () => resolve(memory);
            request.onerror = () => reject(request.error);
        });
    },

    async update(memory) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(memory);

            request.onsuccess = () => resolve(memory);
            request.onerror = () => reject(request.error);
        });
    },

    async delete(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async search(query) {
        const all = await this.getAll();
        return SearchEngine.search(all, query);
    },

    async getByTag(tag) {
        const all = await this.getAll();
        return all.filter(m => m.tags && m.tags.includes(tag));
    },

    async getByProjectId(projectId) {
        const all = await this.getAll();
        if (projectId === 'none') {
            return all.filter(m => !m.projectId);
        }
        return all.filter(m => m.projectId === projectId);
    }
};

window.DB = DB;