/**
 * Hook Auto-Save
 * Gestisce il salvataggio automatico su IndexedDB (via storageProvider) con debounce
 * Sistema Gestione ISO 9001 - QS Studio
 */

import { useState, useEffect, useRef } from 'react';

/**
 * Hook per auto-save con debounce (IndexedDB)
 * @param {Object} data - Dati da salvare
 * @param {Object} storageProvider - Provider IndexedDB (fsProvider)
 * @param {string} entityType - Tipo entità: 'audit' | 'audits'
 * @param {number} delay - Delay debounce in ms (default 2000)
 * @returns {string} saveStatus - 'idle' | 'saving' | 'saved' | 'error'
 */
export function useAutoSave(data, storageProvider, entityType, delay = 2000) {
    const [saveStatus, setSaveStatus] = useState('idle');
    const timeoutRef = useRef(null);
    const previousDataRef = useRef(null);

    useEffect(() => {
        // Skip se dati non forniti o provider non pronto
        if (!data || !storageProvider) {
            return;
        }

        // Skip se dati identici a salvataggio precedente
        const currentDataString = JSON.stringify(data);
        if (currentDataString === previousDataRef.current) {
            return;
        }

        // Clear timeout precedente
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Imposta status saving
        setSaveStatus('saving');

        // Debounce save
        timeoutRef.current = setTimeout(async () => {
            try {
                // Salva in IndexedDB via storageProvider
                if (entityType === 'audit' && data.metadata?.id) {
                    await storageProvider.saveAudit(data);
                    console.log(`💾 [AUTO-SAVE] Audit ${data.metadata.id} salvato in IndexedDB`);
                } else if (entityType === 'audits' && Array.isArray(data)) {
                    // Salva ogni audit individualmente (più robusto)
                    for (const audit of data) {
                        await storageProvider.saveAudit(audit);
                    }
                    console.log(`💾 [AUTO-SAVE] ${data.length} audit salvati in IndexedDB`);
                }

                previousDataRef.current = currentDataString;
                setSaveStatus('saved');

                // Reset a idle dopo 1s
                setTimeout(() => {
                    setSaveStatus('idle');
                }, 1000);

            } catch (error) {
                console.error('❌ Auto-save error (IndexedDB):', error);
                setSaveStatus('error');

                // Reset a idle dopo 2s
                setTimeout(() => {
                    setSaveStatus('idle');
                }, 2000);
            }
        }, delay);

        // Cleanup
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [data, storageProvider, entityType, delay]);

    return saveStatus;
}

/**
 * Hook per auto-save multipli (audit + lista audits) in IndexedDB
 * @param {Object} currentAudit - Audit corrente
 * @param {Array} audits - Lista tutti gli audit
 * @param {Object} storageProvider - Provider IndexedDB
 * @returns {Object} { auditSaveStatus, listSaveStatus, isSaving, allSaved }
 */
export function useAutoSaveMultiple(currentAudit, audits, storageProvider) {
    const auditSaveStatus = useAutoSave(
        currentAudit,
        storageProvider,
        'audit',
        2000
    );

    const listSaveStatus = useAutoSave(
        audits,
        storageProvider,
        'audits',
        3000 // Delay maggiore per batch save
    );

    return {
        auditSaveStatus,
        listSaveStatus,
        isSaving: auditSaveStatus === 'saving' || listSaveStatus === 'saving',
        allSaved: auditSaveStatus === 'saved' && listSaveStatus === 'saved'
    };
}

export default useAutoSave;
