
import { Character, StoryboardScene, Scene } from '../types';

const DB_NAME = 'SparkFrameDB';
const DB_VERSION = 1;
const STORES = {
    characters: 'characters',
    storyboard: 'storyboard',
    appState: 'appState', // For key-value pairs like activeScene
};

let db: IDBDatabase;

const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('IndexedDB error:', request.error);
            reject('Error opening IndexedDB.');
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const tempDb = (event.target as IDBOpenDBRequest).result;
            if (!tempDb.objectStoreNames.contains(STORES.characters)) {
                tempDb.createObjectStore(STORES.characters, { keyPath: 'id' });
            }
            if (!tempDb.objectStoreNames.contains(STORES.storyboard)) {
                tempDb.createObjectStore(STORES.storyboard, { keyPath: 'id' });
            }
            if (!tempDb.objectStoreNames.contains(STORES.appState)) {
                tempDb.createObjectStore(STORES.appState, { keyPath: 'key' });
            }
        };
    });
};

export const put = async <T>(storeName: string, item: T): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(item);

        request.onsuccess = () => resolve();
        request.onerror = () => {
             console.error(`Error putting item in ${storeName}:`, request.error)
             reject(request.error)
        };
    });
};

export const del = async (storeName: string, key: IDBValidKey): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => {
             console.error(`Error deleting item from ${storeName}:`, request.error)
             reject(request.error)
        };
    });
};


export const getAll = async <T>(storeName: string): Promise<T[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            console.error(`Error getting all items from ${storeName}:`, request.error);
            reject(request.error);
        };
    });
};

export const getAppState = async <T>(key: string): Promise<T | undefined> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.appState, 'readonly');
        const store = transaction.objectStore(STORES.appState);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result?.value);
        request.onerror = () => reject(request.error);
    });
};

export const setAppState = async (key: string, value: any): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.appState, 'readwrite');
        const store = transaction.objectStore(STORES.appState);
        const request = store.put({ key, value });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const clearStore = async (storeName: string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const dbService = {
    STORES,
    putCharacter: (char: Character) => put(STORES.characters, char),
    deleteCharacter: (id: string) => del(STORES.characters, id),
    getAllCharacters: () => getAll<Character>(STORES.characters),
    putStoryboardScene: (scene: StoryboardScene) => put(STORES.storyboard, scene),
    getAllStoryboardScenes: () => getAll<StoryboardScene>(STORES.storyboard),
    clearStoryboard: () => clearStore(STORES.storyboard),
    getActiveScene: () => getAppState<Scene>('activeScene'),
    setActiveScene: (scene: Scene | null) => setAppState('activeScene', scene),
    getActiveCharacter: () => getAppState<Character>('activeCharacter'),
    setActiveCharacter: (char: Character | null) => setAppState('activeCharacter', char),
};
