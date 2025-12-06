/**
 * Sync Service - Gestione sincronizzazione offline-online
 * 
 * Features:
 * - Queue retry per chiamate API fallite
 * - Background sync quando connessione torna disponibile
 * - Conflict resolution timestamp-based
 * - Metadata tracking per audit modificati offline
 */

import { getDatabase } from './IndexedDBProvider';

const SYNC_QUEUE_STORE = 'syncQueue';
const SYNC_STATUS_KEY = 'lastSyncStatus';

/**
 * Struttura SyncQueueItem
 * {
 *   id: string (UUID),
 *   type: 'create_audit' | 'update_audit' | 'delete_audit' | 'upload_attachment',
 *   payload: any,
 *   timestamp: number,
 *   retryCount: number,
 *   lastError: string
 * }
 */

export class SyncService {
    constructor(apiBaseUrl = '/api/v1') {
        this.apiBaseUrl = apiBaseUrl;
        this.isOnline = navigator.onLine;
        this.isSyncing = false;

        // Monitor connessione
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    /**
     * Inizializza sync queue in IndexedDB
     */
    async init() {
        const db = await getDatabase();

        // Crea object store per sync queue se non esiste
        if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
            db.close();
            const request = indexedDB.open('SGQ_ISO9001_DB', db.version + 1);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
                    const store = db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                }
            };

            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }

        return db;
    }

    /**
     * Aggiungi operazione a sync queue
     */
    async enqueue(type, payload) {
        const db = await this.init();

        const queueItem = {
            id: crypto.randomUUID(),
            type,
            payload,
            timestamp: Date.now(),
            retryCount: 0,
            lastError: null
        };

        const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
        const store = transaction.objectStore(SYNC_QUEUE_STORE);

        await new Promise((resolve, reject) => {
            const request = store.add(queueItem);
            request.onsuccess = () => {
                console.log(`📤 [SYNC QUEUE] Aggiunto: ${type}`, queueItem.id);
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });

        // Tenta sync immediata se online
        if (this.isOnline) {
            this.processQueue();
        }

        return queueItem.id;
    }

    /**
     * Processa sync queue
     */
    async processQueue() {
        if (this.isSyncing || !this.isOnline) {
            return;
        }

        this.isSyncing = true;
        console.log('🔄 [SYNC] Inizio processamento queue...');

        try {
            const db = await this.init();
            const transaction = db.transaction([SYNC_QUEUE_STORE], 'readonly');
            const store = transaction.objectStore(SYNC_QUEUE_STORE);
            const index = store.index('timestamp');

            const items = await new Promise((resolve, reject) => {
                const request = index.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            console.log(`📋 [SYNC] Trovati ${items.length} item in queue`);

            for (const item of items) {
                try {
                    await this.syncItem(item);
                    await this.removeFromQueue(item.id);
                    console.log(`✅ [SYNC] Completato: ${item.type} (${item.id})`);
                } catch (error) {
                    console.error(`❌ [SYNC] Errore: ${item.type} (${item.id})`, error);
                    await this.updateRetryCount(item.id, error.message);
                }
            }

            // Aggiorna last sync timestamp
            localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify({
                lastSync: Date.now(),
                status: 'success',
                itemsProcessed: items.length
            }));

        } catch (error) {
            console.error('❌ [SYNC] Errore processamento queue:', error);
            localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify({
                lastSync: Date.now(),
                status: 'error',
                error: error.message
            }));
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Sincronizza singolo item
     */
    async syncItem(item) {
        const { type, payload } = item;

        switch (type) {
            case 'create_audit':
                return await this.syncCreateAudit(payload);

            case 'update_audit':
                return await this.syncUpdateAudit(payload);

            case 'delete_audit':
                return await this.syncDeleteAudit(payload);

            case 'upload_attachment':
                return await this.syncUploadAttachment(payload);

            default:
                throw new Error(`Tipo sync non supportato: ${type}`);
        }
    }

    /**
     * Sync: Crea audit su server
     */
    async syncCreateAudit(auditData) {
        const response = await fetch(`${this.apiBaseUrl}/audits`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: JSON.stringify(auditData)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const result = await response.json();

        // Aggiorna sync_metadata
        await this.updateSyncMetadata('audit', auditData.id, result.audit_id);

        return result;
    }

    /**
     * Sync: Aggiorna audit su server (con conflict resolution)
     */
    async syncUpdateAudit(auditData) {
        const response = await fetch(`${this.apiBaseUrl}/audits/${auditData.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getToken()}`,
                'If-Unmodified-Since': auditData.lastModified // Conditional PUT
            },
            body: JSON.stringify(auditData)
        });

        if (response.status === 412) {
            // Conflict: Server version più recente
            console.warn('⚠️ [SYNC] Conflict rilevato per audit:', auditData.id);
            return await this.resolveConflict(auditData);
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        return await response.json();
    }

    /**
     * Risolve conflict timestamp-based (last-write-wins)
     */
    async resolveConflict(localAudit) {
        // Scarica versione server
        const response = await fetch(`${this.apiBaseUrl}/audits/${localAudit.id}`, {
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        });

        const serverAudit = await response.json();

        // Confronta timestamp
        const localTime = new Date(localAudit.metadata.lastModified).getTime();
        const serverTime = new Date(serverAudit.updated_at).getTime();

        if (localTime > serverTime) {
            // Locale più recente → forza update
            console.log('🔧 [CONFLICT] Locale più recente, forzo update');
            const forceResponse = await fetch(`${this.apiBaseUrl}/audits/${localAudit.id}?force=true`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify(localAudit)
            });
            return await forceResponse.json();
        } else {
            // Server più recente → aggiorna locale
            console.log('🔧 [CONFLICT] Server più recente, aggiorno locale');
            await this.updateLocalAudit(serverAudit);
            throw new Error('CONFLICT_RESOLVED_SERVER_WINS');
        }
    }

    /**
     * Sync: Elimina audit su server
     */
    async syncDeleteAudit(payload) {
        const response = await fetch(`${this.apiBaseUrl}/audits/${payload.auditId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        });

        if (!response.ok && response.status !== 404) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        return { deleted: true };
    }

    /**
     * Sync: Upload attachment
     */
    async syncUploadAttachment(payload) {
        const formData = new FormData();
        formData.append('file', payload.file);
        formData.append('auditId', payload.auditId);
        formData.append('category', payload.category);

        const response = await fetch(`${this.apiBaseUrl}/attachments`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.getToken()}` },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        return await response.json();
    }

    /**
     * Rimuovi item da sync queue
     */
    async removeFromQueue(itemId) {
        const db = await this.init();
        const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
        const store = transaction.objectStore(SYNC_QUEUE_STORE);

        await new Promise((resolve, reject) => {
            const request = store.delete(itemId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Aggiorna retry count
     */
    async updateRetryCount(itemId, errorMessage) {
        const db = await this.init();
        const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
        const store = transaction.objectStore(SYNC_QUEUE_STORE);

        const item = await new Promise((resolve, reject) => {
            const request = store.get(itemId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        if (item) {
            item.retryCount += 1;
            item.lastError = errorMessage;

            // Rimuovi se troppi retry (>5)
            if (item.retryCount > 5) {
                console.error(`❌ [SYNC] Troppi retry per ${itemId}, rimosso da queue`);
                await this.removeFromQueue(itemId);
                return;
            }

            await new Promise((resolve, reject) => {
                const request = store.put(item);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
    }

    /**
     * Aggiorna sync_metadata
     */
    async updateSyncMetadata(entityType, localId, serverId) {
        // TODO: Implementare con chiamata API
        console.log(`📝 [SYNC METADATA] ${entityType} ${localId} → ${serverId}`);
    }

    /**
     * Aggiorna audit locale con versione server
     */
    async updateLocalAudit(serverAudit) {
        // TODO: Implementare con IndexedDBProvider
        console.log('📥 [SYNC] Aggiornamento audit locale:', serverAudit.id);
    }

    /**
     * Get auth token
     */
    getToken() {
        return localStorage.getItem('authToken') || '';
    }

    /**
     * Handler: Connessione online
     */
    handleOnline() {
        console.log('🌐 [SYNC] Connessione ripristinata');
        this.isOnline = true;

        // Avvia sync automatica dopo 2 secondi
        setTimeout(() => this.processQueue(), 2000);
    }

    /**
     * Handler: Connessione offline
     */
    handleOffline() {
        console.log('📵 [SYNC] Connessione persa - modalità offline attiva');
        this.isOnline = false;
    }

    /**
     * Ottieni stato sync
     */
    getSyncStatus() {
        const statusJson = localStorage.getItem(SYNC_STATUS_KEY);
        return statusJson ? JSON.parse(statusJson) : null;
    }

    /**
     * Conta item in queue
     */
    async getQueueSize() {
        const db = await this.init();
        const transaction = db.transaction([SYNC_QUEUE_STORE], 'readonly');
        const store = transaction.objectStore(SYNC_QUEUE_STORE);

        return new Promise((resolve, reject) => {
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

// Export singleton
export const syncService = new SyncService();
