/**
 * Storage Adapter - Gestisce fallback tra LocalFsProvider e IndexedDBProvider
 * Rileva device e sceglie storage ottimale
 * Sistema Gestione ISO 9001 - QS Studio
 */

import { LocalFsProvider } from './LocalFsProvider';
import { IndexedDBProvider } from './IndexedDBProvider';

/**
 * Rileva se siamo su dispositivo mobile
 */
export function isMobileDevice() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/**
 * Verifica supporto File System Access API
 */
export function hasFileSystemAccess() {
    return 'showDirectoryPicker' in window;
}

/**
 * Determina quale storage provider usare
 * FORZATO: IndexedDB per ADR-002 (offline-first con sync SQL Server)
 */
export function getRecommendedStorage() {
    // SEMPRE IndexedDB per conformità ADR-002
    // Single Source of Truth con sync automatico
    return {
        type: 'indexeddb',
        reason: 'Offline-first strategy (ADR-002)',
    };
}

/**
 * Factory per creare storage provider appropriato
 * ADR-002: SEMPRE IndexedDB per offline-first
 */
export async function createStorageProvider() {
    const recommendation = getRecommendedStorage();

    console.log(
        `📦 Storage provider: ${recommendation.type} (${recommendation.reason})`
    );

    // SEMPRE IndexedDB (ADR-002)
    const provider = new IndexedDBProvider();
    await provider.initialize();
    return provider;
}

/**
 * Informazioni device e storage per UI
 */
export function getDeviceInfo() {
    const mobile = isMobileDevice();
    const hasFS = hasFileSystemAccess();
    const recommendation = getRecommendedStorage();

    return {
        isMobile: mobile,
        hasFileSystemAccess: hasFS,
        recommendedStorage: recommendation.type,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
    };
}
