/**
 * Storage Context
 * Gestione stato globale audit con persistenza localStorage
 * Sistema Gestione ISO 9001 - QS Studio
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { MOCK_AUDITS } from "../data/mockAudits";
import { createNewAudit, validateAuditSchema } from "../data/auditDataModel";
import { useAutoSaveMultiple } from "../hooks/useAutoSave";
import { initializeISO9001Checklist } from "../utils/checklistInitializer";
import {
  createStorageProvider,
  getDeviceInfo,
} from "../services/storageAdapter";
import { syncService } from "../services/syncService";

// Crea Context
const StorageContext = createContext(null);

// Chiavi localStorage
const STORAGE_KEYS = {
  AUDITS: "audits",
  CURRENT_AUDIT_ID: "currentAuditId",
  FS_CONNECTED: "fsConnected",
};

/**
 * Helper: normalizza status checklist per compatibilità
 * Assicura che tutti gli status siano in formato stringa corretto
 */
function normalizeChecklistStatus(checklist) {
  if (!checklist) return checklist;

  const normalized = {};

  Object.entries(checklist).forEach(([normKey, normData]) => {
    if (!normData || typeof normData !== "object") {
      normalized[normKey] = normData;
      return;
    }

    normalized[normKey] = {};

    Object.entries(normData).forEach(([clauseKey, clause]) => {
      if (!clause || !clause.questions) {
        normalized[normKey][clauseKey] = clause;
        return;
      }

      normalized[normKey][clauseKey] = {
        ...clause,
        questions: clause.questions.map((q) => ({
          ...q,
          // Normalizza status: accetta undefined, null, stringa vuota come NOT_ANSWERED
          status: normalizeStatus(q.status),
        })),
      };
    });
  });

  return normalized;
}

/**
 * Helper: normalizza singolo status
 */
function normalizeStatus(status) {
  if (!status || status === "") return "NOT_ANSWERED";

  // Già in formato corretto
  if (["C", "NC", "OSS", "OM", "NA", "NOT_ANSWERED"].includes(status)) {
    return status;
  }

  // Legacy format → new format
  const legacyMap = {
    compliant: "C",
    non_compliant: "NC",
    partial: "OSS",
    not_applicable: "NA",
  };

  return legacyMap[status] || "NOT_ANSWERED";
}

/**
 * Provider per gestione stato audit
 */
export function StorageProvider({ children, useMockData = true }) {
  // Storage Provider dinamico (LocalFs o IndexedDB)
  const [fsProvider, setFsProvider] = useState(null);
  const [deviceInfo] = useState(() => getDeviceInfo());
  const [, forceUpdate] = useState({});

  // Inizializza storage provider appropriato
  useEffect(() => {
    async function initStorage() {
      const provider = await createStorageProvider();
      setFsProvider(provider);

      // Trigger update per componenti dipendenti
      provider._triggerUpdate = () => forceUpdate({});

      console.log(
        `✅ Storage provider inizializzato: ${deviceInfo.recommendedStorage}`
      );
    }
    initStorage();
  }, [deviceInfo.recommendedStorage]);

  // Stato
  const [audits, setAudits] = useState([]);
  const [currentAuditId, setCurrentAuditId] = useState(null);
  const [fsConnected, setFsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync state
  const [syncStatus, setSyncStatus] = useState({
    isSyncing: false,
    queueSize: 0,
    lastSync: null,
    hasConflict: false,
    conflictData: null,
  });

  // Audit corrente (computed) - supporta sia metadata.id che id top-level
  const currentAudit =
    audits.find((a) => {
      const auditId = a.metadata?.id || a.id;
      return auditId === currentAuditId;
    }) || null;

  // DEBUG: Log per capire il problema
  useEffect(() => {
    console.log("🔍 DEBUG StorageContext:", {
      auditsCount: audits.length,
      currentAuditId,
      currentAudit: currentAudit ? "FOUND" : "NULL",
      firstAuditId: audits[0]?.metadata?.id || audits[0]?.id,
      auditsIds: audits.map((a) => a.metadata?.id || a.id),
    });
  }, [audits, currentAuditId, currentAudit]);

  // Auto-save multiplo con IndexedDB
  const { auditSaveStatus, listSaveStatus, isSaving, allSaved } =
    useAutoSaveMultiple(currentAudit, audits, fsProvider);

  // === SYNC INIZIALE ALL'AVVIO + AUTO-SYNC POLLING ===
  useEffect(() => {
    async function initSyncAndPolling() {
      console.log("🚀 [INIT] Avvio sync iniziale...");

      try {
        // Avvia auto-sync polling (30s)
        syncService.startAutoSync();

        if (!navigator.onLine) {
          console.log("📴 [INIT] Offline - carico solo dati locali");
          setSyncStatus((prev) => ({
            ...prev,
            lastSync: null,
            isSyncing: false,
          }));
          return;
        }

        // Verifica server raggiungibile
        const serverReachable = await syncService.isServerReachable();
        if (!serverReachable) {
          console.warn("⚠️ [INIT] Server non raggiungibile - fallback locale");
          return;
        }

        setSyncStatus((prev) => ({ ...prev, isSyncing: true }));

        // Processa queue esistente
        await syncService.processQueue();

        // Aggiorna queue size
        const queueSize = await syncService.getQueueSize();
        setSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          queueSize,
          lastSync: new Date().toISOString(),
        }));

        console.log(
          "✅ [INIT] Sync iniziale completata, queue size:",
          queueSize
        );
      } catch (error) {
        console.error("❌ [INIT] Errore sync iniziale:", error);
        setSyncStatus((prev) => ({ ...prev, isSyncing: false }));
      }
    }

    initSyncAndPolling();

    // Cleanup: ferma auto-sync al unmount
    return () => {
      syncService.stopAutoSync();
    };
  }, []); // Solo al mount

  // === INIZIALIZZAZIONE: MIGRAZIONE localStorage → IndexedDB + CARICAMENTO ===
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    async function loadAuditsFromIndexedDB() {
      try {
        if (!fsProvider) {
          console.log("⏳ [LOAD] Storage provider non ancora pronto");
          return; // Non procedere se fsProvider non è inizializzato
        }

        if (hasInitialized) {
          console.log("⏭️ [LOAD] Già inizializzato, skip");
          return;
        }

        setIsLoading(true);

        // MIGRAZIONE UNA TANTUM: localStorage → IndexedDB
        const storedAudits = localStorage.getItem(STORAGE_KEYS.AUDITS);
        if (storedAudits) {
          console.log(
            "🔄 [MIGRATION] Rilevati audit in localStorage, migrazione in corso..."
          );
          try {
            const parsedAudits = JSON.parse(storedAudits);

            for (const audit of parsedAudits) {
              const normalizedAudit = {
                ...audit,
                checklist: normalizeChecklistStatus(audit.checklist),
              };
              await fsProvider.saveAudit(normalizedAudit);

              // Enqueue per sync server
              await syncService.enqueue("create_audit", normalizedAudit);
            }

            console.log(
              `✅ [MIGRATION] Migrati ${parsedAudits.length} audit in IndexedDB + sync queue`
            );

            // Rimuovi da localStorage dopo migrazione
            localStorage.removeItem(STORAGE_KEYS.AUDITS);
            localStorage.removeItem(STORAGE_KEYS.CURRENT_AUDIT_ID);
          } catch (migrationError) {
            console.error("❌ [MIGRATION] Errore migrazione:", migrationError);
          }
        }

        // CARICAMENTO: Leggi da IndexedDB (Single Source of Truth)
        const allAudits = await fsProvider.loadAllAudits();

        if (allAudits && allAudits.length > 0) {
          setAudits(allAudits);
          setCurrentAuditId(null); // Mostra sempre selector all'avvio
          console.log(
            `✅ Caricati ${allAudits.length} audit da IndexedDB - selector mode`
          );
        } else if (useMockData) {
          // Prima inizializzazione: salva mock data in IndexedDB
          console.log(
            "🆕 [INIT] Prima inizializzazione, salvo mock data in IndexedDB..."
          );
          for (const audit of MOCK_AUDITS) {
            await fsProvider.saveAudit(audit);
          }
          setAudits(MOCK_AUDITS);
          setCurrentAuditId(null);
          console.log(
            `✅ Inizializzato con ${MOCK_AUDITS.length} mock audit in IndexedDB - selector mode`
          );
        } else {
          setAudits([]);
          setCurrentAuditId(null);
          console.log("ℹ️ Nessun audit disponibile");
        }

        // FS Connected status (backward compatibility)
        const storedFsConnected =
          localStorage.getItem(STORAGE_KEYS.FS_CONNECTED) === "true";
        setFsConnected(storedFsConnected);

        setIsLoading(false);
        setHasInitialized(true); // Marca come inizializzato
      } catch (err) {
        console.error("❌ Errore caricamento audit da IndexedDB:", err);
        setError("Errore caricamento dati");
        setIsLoading(false);
      }
    }

    loadAuditsFromIndexedDB();
  }, [fsProvider, useMockData, hasInitialized]);

  // === SALVATAGGIO AUTOMATICO IN INDEXEDDB (depreca localStorage) ===
  useEffect(() => {
    if (audits.length === 0 || !fsProvider) return;

    // NO più localStorage.setItem! IndexedDB è il Single Source of Truth
    // Salvataggio gestito da useAutoSaveMultiple → fsProvider.saveAudit()
    console.log(
      `📊 [STATE] ${audits.length} audit in memoria (IndexedDB è il primary storage)`
    );
  }, [audits, fsProvider]);

  // === SALVA CURRENT AUDIT ID ===
  // RIMOSSO: Non salvare più currentAuditId - mostra sempre selector all'avvio
  // useEffect(() => {
  //   if (currentAuditId) {
  //     localStorage.setItem(STORAGE_KEYS.CURRENT_AUDIT_ID, currentAuditId);
  //   }
  // }, [currentAuditId]);

  // === CRUD OPERATIONS ===

  /**
   * Aggiorna audit corrente
   */
  const updateCurrentAudit = useCallback(
    (updater) => {
      setAudits((prevAudits) => {
        return prevAudits.map((audit) => {
          const auditId = audit.metadata?.id || audit.id;
          if (auditId === currentAuditId) {
            const updated =
              typeof updater === "function" ? updater(audit) : updater;

            // Valida schema
            const validation = validateAuditSchema(updated);
            if (!validation.valid) {
              console.warn("⚠️ Schema validation errors:", validation.errors);
            }

            // Enqueue sync se online
            if (navigator.onLine) {
              syncService
                .enqueue("update_audit", {
                  id: updated.metadata?.id || updated.id,
                  ...updated,
                })
                .catch((err) => {
                  console.error("❌ [SYNC] Errore enqueue update:", err);
                });
            }

            return updated;
          }
          return audit;
        });
      });
    },
    [currentAuditId]
  );

  /**
   * Cambia audit corrente
   */
  const switchAudit = useCallback(
    (auditId) => {
      const audit = audits.find((a) => {
        const id = a.metadata?.id || a.id;
        return id === auditId;
      });
      if (audit) {
        setCurrentAuditId(auditId);
        console.log(`✅ Switched to audit: ${audit.metadata.auditNumber}`);
        return true;
      }
      console.warn(`⚠️ Audit not found: ${auditId}`);
      return false;
    },
    [audits]
  );

  /**
   * Crea nuovo audit
   */
  const createAudit = useCallback((metadata) => {
    try {
      const newAudit = createNewAudit(metadata);

      setAudits((prevAudits) => [...prevAudits, newAudit]);
      setCurrentAuditId(newAudit.metadata.id);

      // Enqueue sync se online
      if (navigator.onLine) {
        syncService.enqueue("create_audit", newAudit).catch((err) => {
          console.error("❌ [SYNC] Errore enqueue create:", err);
        });
      }

      console.log(`✅ Created audit: ${newAudit.metadata.auditNumber}`);
      return newAudit;
    } catch (err) {
      console.error("Errore creazione audit:", err);
      setError("Errore creazione audit");
      return null;
    }
  }, []);

  /**
   * Duplica audit esistente
   */
  const duplicateAudit = useCallback(
    (auditId, newMetadata) => {
      const sourcAudit = audits.find((a) => {
        const id = a.metadata?.id || a.id;
        return id === auditId;
      });
      if (!sourcAudit) {
        console.warn(`⚠️ Audit not found for duplication: ${auditId}`);
        return null;
      }

      try {
        const duplicated = {
          ...JSON.parse(JSON.stringify(sourcAudit)), // Deep clone
          metadata: {
            ...sourcAudit.metadata,
            ...newMetadata,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
          },
        };

        setAudits((prevAudits) => [...prevAudits, duplicated]);
        setCurrentAuditId(duplicated.metadata.id);

        console.log(`✅ Duplicated audit: ${duplicated.metadata.auditNumber}`);
        return duplicated;
      } catch (err) {
        console.error("Errore duplicazione audit:", err);
        setError("Errore duplicazione audit");
        return null;
      }
    },
    [audits]
  );

  /**
   * Importa backup JSON (ripristina audit da file)
   */
  const importBackup = useCallback(
    async (backupData) => {
      try {
        console.log("📥 Import backup iniziato...");

        // Valida struttura backup
        if (!backupData.audits || !Array.isArray(backupData.audits)) {
          throw new Error("Formato backup non valido");
        }

        // Importa ogni audit
        for (const audit of backupData.audits) {
          if (!validateAuditSchema(audit)) {
            console.warn(
              `⚠️ Audit ${audit.metadata?.auditNumber} non valido, saltato`
            );
            continue;
          }

          // Salva audit nel provider corrente (IndexedDB o LocalFs)
          if (fsProvider?.saveAudit) {
            await fsProvider.saveAudit(audit);
          }

          // Aggiungi a stato se non esiste già
          setAudits((prev) => {
            const exists = prev.some(
              (a) => a.metadata?.id === audit.metadata?.id
            );
            if (exists) {
              console.log(
                `ℹ️ Audit ${audit.metadata?.auditNumber} già esistente, aggiornato`
              );
              return prev.map((a) =>
                a.metadata?.id === audit.metadata?.id ? audit : a
              );
            }
            return [...prev, audit];
          });
        }

        console.log(
          `✅ Import completato: ${backupData.audits.length} audit ripristinati`
        );
        return { success: true, count: backupData.audits.length };
      } catch (err) {
        console.error("❌ Errore import backup:", err);
        setError(err.message);
        return { success: false, error: err.message };
      }
    },
    [fsProvider]
  );

  /**
   * Elimina audit
   */
  const deleteAudit = useCallback(
    (auditId) => {
      const audit = audits.find((a) => {
        const id = a.metadata?.id || a.id;
        return id === auditId;
      });
      if (!audit) {
        console.warn(`⚠️ Audit not found for deletion: ${auditId}`);
        return false;
      }

      setAudits((prevAudits) =>
        prevAudits.filter((a) => {
          const id = a.metadata?.id || a.id;
          return id !== auditId;
        })
      );

      // Enqueue sync se online
      if (navigator.onLine) {
        syncService.enqueue("delete_audit", { auditId }).catch((err) => {
          console.error("❌ [SYNC] Errore enqueue delete:", err);
        });
      }

      // Se elimino audit corrente, switcha al primo disponibile
      if (auditId === currentAuditId) {
        const remaining = audits.filter((a) => {
          const id = a.metadata?.id || a.id;
          return id !== auditId;
        });
        const nextId = remaining[0]?.metadata?.id || remaining[0]?.id || null;
        setCurrentAuditId(nextId);
      }

      // Rimuovi anche localStorage singolo audit
      localStorage.removeItem(`audit_${auditId}`);

      console.log(`✅ Deleted audit: ${audit.metadata.auditNumber}`);
      return true;
    },
    [audits, currentAuditId]
  );

  /**
   * Inizializza checklist per una norma specifica
   * @param {string} standard - ISO_9001, ISO_14001, ISO_45001
   */
  const initializeChecklist = useCallback(
    (standard = "ISO_9001") => {
      if (!currentAudit) {
        console.warn("⚠️ No current audit to initialize checklist");
        return false;
      }

      // Solo ISO 9001 supportato per ora
      if (standard !== "ISO_9001") {
        console.warn(`⚠️ Standard ${standard} not yet supported`);
        return false;
      }

      updateCurrentAudit((audit) => {
        const updatedAudit = { ...audit };

        // Inizializza checklist ISO 9001 se non esiste
        if (!updatedAudit.checklist) {
          updatedAudit.checklist = {};
        }

        if (
          !updatedAudit.checklist.ISO_9001 ||
          Object.keys(updatedAudit.checklist.ISO_9001).length === 0
        ) {
          updatedAudit.checklist.ISO_9001 = initializeISO9001Checklist();
          updatedAudit.metadata.lastModified = new Date().toISOString();

          // Aggiorna metriche
          const totalQuestions = Object.values(
            updatedAudit.checklist.ISO_9001
          ).reduce((sum, clause) => sum + (clause.questions?.length || 0), 0);
          updatedAudit.metrics.totalQuestions = totalQuestions;

          console.log(
            `✅ Initialized ISO 9001 checklist (${totalQuestions} questions)`
          );
        } else {
          console.log("ℹ️ Checklist already initialized");
        }

        return updatedAudit;
      });

      return true;
    },
    [currentAudit, updateCurrentAudit]
  );

  /**
   * Reset a mock data (per testing)
   */
  const resetToMockData = useCallback(() => {
    setAudits(MOCK_AUDITS);
    const firstAuditId =
      MOCK_AUDITS[0]?.metadata?.id || MOCK_AUDITS[0]?.id || null;
    setCurrentAuditId(firstAuditId);
    localStorage.removeItem(STORAGE_KEYS.AUDITS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_AUDIT_ID);
    console.log("✅ Reset to mock data");
  }, []);

  /**
   * Cancella tutto (per testing)
   */
  const clearAllData = useCallback(() => {
    setAudits([]);
    setCurrentAuditId(null);
    setFsConnected(false);
    localStorage.clear();
    console.log("✅ All data cleared");
  }, []);

  // === FILE SYSTEM ACCESS API ===

  /**
   * Connetti File System Access API
   */
  const connectFileSystem = useCallback(async () => {
    try {
      if (!window.showDirectoryPicker) {
        throw new Error("File System Access API non supportata");
      }

      // Request directory handle
      const dirHandle = await window.showDirectoryPicker({
        mode: "readwrite",
        startIn: "documents",
      });

      // TODO: Implementare LocalFsProvider (STEP 13)
      console.log("✅ File System connected:", dirHandle.name);

      setFsConnected(true);
      localStorage.setItem(STORAGE_KEYS.FS_CONNECTED, "true");

      return dirHandle;
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Errore connessione File System:", err);
        setError("Errore connessione File System");
      }
      return null;
    }
  }, []);

  /**
   * Disconnetti File System
   */
  const disconnectFileSystem = useCallback(() => {
    setFsConnected(false);
    localStorage.setItem(STORAGE_KEYS.FS_CONNECTED, "false");
    console.log("✅ File System disconnected");
  }, []);

  /**
   * Forza sync manuale
   */
  const triggerManualSync = useCallback(async () => {
    if (!navigator.onLine) {
      console.warn("⚠️ [SYNC] Impossibile sincronizzare: offline");
      return { success: false, error: "Offline" };
    }

    try {
      setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
      await syncService.processQueue();
      const queueSize = await syncService.getQueueSize();
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        queueSize,
        lastSync: new Date().toISOString(),
      }));
      console.log("✅ [SYNC] Sync manuale completata");
      return { success: true, queueSize };
    } catch (error) {
      console.error("❌ [SYNC] Errore sync manuale:", error);
      setSyncStatus((prev) => ({ ...prev, isSyncing: false }));
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Risolvi conflitto manualmente (scelta utente)
   */
  const resolveConflict = useCallback((choice) => {
    if (choice === "keep_local") {
      // Mantieni versione locale, forza upload
      console.log("🔧 [CONFLICT] Utente sceglie: mantieni locale");
      // TODO: Implementare force push
    } else if (choice === "use_server") {
      // Scarica versione server, sovrascrivi locale
      console.log("🔧 [CONFLICT] Utente sceglie: usa server");
      // TODO: Implementare download + overwrite locale
    }

    // Chiudi dialog
    setSyncStatus((prev) => ({
      ...prev,
      hasConflict: false,
      conflictData: null,
    }));
  }, []);

  // Context value
  const value = {
    // State
    audits,
    currentAudit,
    currentAuditId,
    fsConnected,
    isLoading,
    error,
    setFsConnected,

    // Provider
    fsProvider,
    deviceInfo,

    // Save status
    isSaving,
    allSaved,
    auditSaveStatus,
    listSaveStatus,

    // Sync status
    syncStatus,
    triggerManualSync,
    resolveConflict,

    // CRUD operations
    updateCurrentAudit,
    switchAudit,
    createAudit,
    duplicateAudit,
    deleteAudit,
    initializeChecklist,
    importBackup,

    // File System
    connectFileSystem,
    disconnectFileSystem,

    // Utilities
    resetToMockData,
    clearAllData,
  };

  return (
    <StorageContext.Provider value={value}>{children}</StorageContext.Provider>
  );
}

/**
 * Hook per consumare Storage Context
 */
export function useStorage() {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error("useStorage must be used within StorageProvider");
  }
  return context;
}

export default StorageContext;
