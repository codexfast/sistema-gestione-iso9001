/**
 * useCheckpointSaver.js
 * 
 * Hook per auto-save checkpoint su File System tramite LocalFsProvider.
 * Complementare a useAutoSave (che gestisce localStorage).
 * 
 * Usage:
 * const { lastCheckpointTime, isSaving } = useCheckpointSaver(
 *   audit, 
 *   fsProvider, 
 *   { intervalMs: 30000 }
 * );
 */

import { useState, useEffect, useRef } from "react";

/**
 * Hook per salvataggio periodico checkpoint su File System
 * @param {Object} audit - Audit corrente da salvare
 * @param {LocalFsProvider} fsProvider - File System Provider
 * @param {Object} options - Opzioni configurazione
 * @returns {Object} Stato checkpoint saver
 */
export function useCheckpointSaver(audit, fsProvider, options = {}) {
    const {
        intervalMs = 30000, // Default: 30 secondi
        enabled = true,
        onSave = null, // Callback dopo save
        onError = null, // Callback errore
    } = options;

    const [lastCheckpointTime, setLastCheckpointTime] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [checkpointCount, setCheckpointCount] = useState(0);
    const intervalRef = useRef(null);

    // Ref per l'audit: aggiornato ad ogni render ma NON nella dependency
    // dell'effect interval — evita il re-avvio del setInterval ad ogni modifica audit
    const auditRef = useRef(audit);
    useEffect(() => {
        auditRef.current = audit;
    }, [audit]);

    useEffect(() => {
        // Non avviare se disabilitato o mancano parametri
        if (!enabled || !fsProvider) {
            return;
        }

        // Non avviare se workspace non collegato
        if (!fsProvider.ready()) {
            return;
        }

        // Funzione save checkpoint: legge audit da ref (sempre aggiornato)
        const doSave = async () => {
            const currentAudit = auditRef.current;
            if (!currentAudit) return;

            try {
                setIsSaving(true);

                await fsProvider.saveCheckpoint(currentAudit);

                const now = new Date();
                setLastCheckpointTime(now);
                setCheckpointCount((prev) => prev + 1);

                console.log(`[Checkpoint] Salvato: ${now.toLocaleTimeString()}`);

                if (onSave) {
                    onSave(now);
                }
            } catch (error) {
                console.error("[Checkpoint] Errore salvataggio:", error);

                if (onError) {
                    onError(error);
                }
            } finally {
                setIsSaving(false);
            }
        };

        // Salvataggio iniziale immediato
        doSave();

        // Intervallo periodico
        intervalRef.current = setInterval(doSave, intervalMs);

        // Cleanup
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
        // audit rimosso dalle deps: il ref garantisce sempre l'ultimo valore senza
        // riavviare l'intervallo ad ogni modifica dell'audit (causa re-render loop)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fsProvider, enabled, intervalMs]);

    return {
        lastCheckpointTime,
        isSaving,
        checkpointCount,
    };
}

export default useCheckpointSaver;
