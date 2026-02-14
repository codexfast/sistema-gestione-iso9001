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
import {
  fetchChecklistQuestions,
  buildChecklistStructure,
} from "../services/checklistService";
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
        `✅ Storage provider inizializzato: ${deviceInfo.recommendedStorage}`,
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
          queueSize,
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
            "🔄 [MIGRATION] Rilevati audit in localStorage, migrazione in corso...",
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
              `✅ [MIGRATION] Migrati ${parsedAudits.length} audit in IndexedDB + sync queue`,
            );

            // Rimuovi da localStorage dopo migrazione
            localStorage.removeItem(STORAGE_KEYS.AUDITS);
            localStorage.removeItem(STORAGE_KEYS.CURRENT_AUDIT_ID);
          } catch (migrationError) {
            console.error("❌ [MIGRATION] Errore migrazione:", migrationError);
          }
        }

        // CARICAMENTO: Leggi da IndexedDB (cache locale)
        const localAudits = await fsProvider.loadAllAudits();
        
        // DOWNLOAD DAL SERVER: Sincronizzazione bidirezionale
        let serverAudits = [];
        if (navigator.onLine) {
          try {
            console.log("🌐 [DOWNLOAD] Scarico audit dal server...");
            const apiService = (await import('../services/apiService')).default;
            const converter = await import('../utils/auditConverter');
            
            const response = await apiService.getAudits();
            const backendAudits = response.data || [];
            
            // CONVERTI: Backend (snake_case) → Frontend (camelCase + nested)
            serverAudits = converter.convertAuditsFromBackend(backendAudits);
            console.log(`✅ [DOWNLOAD] Scaricati ${serverAudits.length} audit dal server`);
          } catch (err) {
            console.warn("⚠️ [DOWNLOAD] Errore download server, uso cache locale:", err.message);
          }
        }

        // MERGE: Server-wins (dati server sovrascrivono cache locale)
        const mergedAudits = serverAudits.length > 0 ? serverAudits : localAudits;

        if (mergedAudits && mergedAudits.length > 0) {
          // Salva audit server in IndexedDB (aggiorna cache)
          if (serverAudits.length > 0) {
            console.log("💾 [MERGE] Aggiorno IndexedDB con dati server...");
            for (const frontendAudit of serverAudits) {
              await fsProvider.saveAudit(frontendAudit);
            }
            console.log(`✅ [MERGE] ${serverAudits.length} audit salvati in IndexedDB`);
          }

          setAudits(mergedAudits);
          setCurrentAuditId(null); // Mostra sempre selector all'avvio
          console.log(
            `✅ Caricati ${mergedAudits.length} audit (${serverAudits.length} server, ${localAudits.length} cache)`,
          );
        } else if (useMockData) {
          // Prima inizializzazione: salva mock data in IndexedDB + ENQUEUE SYNC
          console.log(
            "🆕 [INIT] Prima inizializzazione, salvo mock data in IndexedDB...",
          );
          for (const audit of MOCK_AUDITS) {
            await fsProvider.saveAudit(audit);

            // ENQUEUE per sync al server (ADR-002: offline-first)
            await syncService.enqueue("create_audit", {
              audit_uuid: audit.id || audit.metadata?.id,
              audit_number: audit.metadata?.auditNumber,
              client_name: audit.metadata?.clientName,
              project_year: audit.metadata?.projectYear,
              audit_date: audit.metadata?.auditDate,
              auditor_name: audit.metadata?.auditorName,
              audit_type: audit.metadata?.auditType,
              status: audit.metadata?.status,
              notes: audit.metadata?.notes,
              total_questions: audit.metadata?.totalQuestions,
              answered_questions: audit.metadata?.answeredQuestions,
              conformities_count: audit.metadata?.conformitiesCount,
              non_conformities_count: audit.metadata?.nonConformitiesCount,
              completion_percentage: audit.metadata?.completionPercentage,
              standard_id: 1, // ISO 9001
              updated_at: new Date().toISOString(),
            });
          }
          setAudits(MOCK_AUDITS);
          setCurrentAuditId(null);
          console.log(
            `✅ Inizializzato con ${MOCK_AUDITS.length} mock audit in IndexedDB + ${MOCK_AUDITS.length} enqueued per sync`,
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
  }, [fsProvider, useMockData]); // hasInitialized NON deve essere dependency (causa loop)

  // === SALVATAGGIO AUTOMATICO IN INDEXEDDB (depreca localStorage) ===
  useEffect(() => {
    if (audits.length === 0 || !fsProvider) return;

    // NO più localStorage.setItem! IndexedDB è il Single Source of Truth
    // Salvataggio gestito da useAutoSaveMultiple → fsProvider.saveAudit()
    console.log(
      `📊 [STATE] ${audits.length} audit in memoria (IndexedDB è il primary storage)`,
    );
  }, [audits, fsProvider]);

  // === SALVA CURRENT AUDIT ID ===
  // RIMOSSO: Non salvare più currentAuditId - mostra sempre selector all'avvio
  // useEffect(() => {
  //   if (currentAuditId) {
  //     localStorage.setItem(STORAGE_KEYS.CURRENT_AUDIT_ID, currentAuditId);
  //   }
  // }, [currentAuditId]);

  // === AUTO-INIZIALIZZAZIONE CHECKLIST ===
  // Quando un nuovo audit viene creato/selezionato, auto-inizializza checklist ISO_9001
  useEffect(() => {
    if (
      currentAudit &&
      currentAudit.metadata?.selectedStandards?.includes("ISO_9001") &&
      (!currentAudit.checklist?.ISO_9001 ||
        Object.keys(currentAudit.checklist.ISO_9001).length === 0)
    ) {
      // Ritarda per evitare race condition
      const timer = setTimeout(() => {
        console.log(
          "[StorageContext] Auto-inizializzazione checklist ISO_9001...",
        );
        // Usa la reference alla funzione, sarà definita dopo
        if (typeof window.__initializeChecklistRef === "function") {
          window.__initializeChecklistRef("ISO_9001");
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [currentAudit]);

  // === CRUD OPERATIONS ===

  /**
   * Estrae risposte checklist da audit per sync
   * @param {Object} audit - Audit con checklist compilata
   * @returns {Array} Array di risposte nel formato backend
   */
  function extractChecklistResponses(audit) {
    const responses = [];
    const checklist = audit.checklist;

    if (!checklist) return responses;

    // Itera su ogni norma (ISO_9001, ISO_14001, ecc.)
    Object.entries(checklist).forEach(([normKey, normData]) => {
      // Itera su ogni clausola
      Object.entries(normData).forEach(([clauseKey, clauseData]) => {
        if (!clauseData.questions || !Array.isArray(clauseData.questions))
          return;

        // Itera su ogni domanda
        clauseData.questions.forEach((question) => {
          // Includi solo domande con risposta (status diverso da NOT_ANSWERED)
          if (question.status && question.status !== "NOT_ANSWERED") {
            responses.push({
              clause_ref: question.clauseRef || question.id, // es: '4.1', '5.2.1'
              conformity_status: question.status, // 'C', 'NC', 'OSS', 'OM', 'NA'
              notes: question.notes || null,
              evidence: question.evidenceRef || null,
              client_updated_at: new Date().toISOString(),
            });
          }
        });
      });
    });

    return responses;
  }

  /**
   * Calcola metriche checklist da struttura audit
   * @param {Object} checklist - Struttura checklist audit
   * @returns {Object} Metriche: {total, answered, conformities, nonConformities}
   */
  function calculateChecklistMetrics(checklist) {
    let total = 0;
    let answered = 0;
    let conformities = 0;
    let nonConformities = 0;

    if (!checklist) return { total, answered, conformities, nonConformities };

    // Itera su ogni norma (ISO_9001, ISO_14001, ecc.)
    Object.values(checklist).forEach((normData) => {
      // Itera su ogni clausola
      Object.values(normData).forEach((clauseData) => {
        if (!clauseData.questions || !Array.isArray(clauseData.questions))
          return;

        // Conta domande
        clauseData.questions.forEach((q) => {
          total++;
          if (q.status && q.status !== "NOT_ANSWERED") {
            answered++;
            if (q.status === "C") conformities++;
            if (q.status === "NC") nonConformities++;
          }
        });
      });
    });

    return { total, answered, conformities, nonConformities };
  }

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

            // Calcola metriche da checklist per sync accurato
            const metrics = calculateChecklistMetrics(updated.checklist);
            const calculatedMetrics = {
              total_questions: metrics.total,
              answered_questions: metrics.answered,
              conformities_count: metrics.conformities,
              non_conformities_count: metrics.nonConformities,
              completion_percentage:
                metrics.total > 0
                  ? Math.round((metrics.answered / metrics.total) * 100 * 100) /
                    100
                  : 0,
            };

            // Enqueue sync audit metadata se online
            if (navigator.onLine) {
              syncService
                .enqueue("update_audit", {
                  audit_uuid: updated.id || updated.metadata?.id, // Backend richiede audit_uuid
                  audit_number: updated.metadata?.auditNumber,
                  client_name: updated.metadata?.clientName,
                  project_year: updated.metadata?.projectYear,
                  audit_date: updated.metadata?.auditDate,
                  auditor_name: updated.metadata?.auditorName,
                  audit_type: updated.metadata?.auditType,
                  status: updated.metadata?.status,
                  notes: updated.metadata?.notes,
                  ...calculatedMetrics, // Metriche calcolate da checklist
                  standard_id: 1, // ISO 9001
                  updated_at: new Date().toISOString(),
                })
                .catch((err) => {
                  console.error("❌ [SYNC] Errore enqueue update:", err);
                });

              // Enqueue sync risposte checklist
              const responses = extractChecklistResponses(updated);
              if (responses.length > 0) {
                syncService
                  .enqueue("save_responses", {
                    auditId: updated.metadata?.id || updated.id,
                    responses: responses,
                  })
                  .then(() => {
                    console.log(
                      `📤 [SYNC] ${responses.length} risposte enqueued per sync`,
                    );
                  })
                  .catch((err) => {
                    console.error("❌ [SYNC] Errore enqueue risposte:", err);
                  });
              }
            }

            return updated;
          }
          return audit;
        });
      });
    },
    [currentAuditId],
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
    [audits],
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
    [audits],
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
              `⚠️ Audit ${audit.metadata?.auditNumber} non valido, saltato`,
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
              (a) => a.metadata?.id === audit.metadata?.id,
            );
            if (exists) {
              console.log(
                `ℹ️ Audit ${audit.metadata?.auditNumber} già esistente, aggiornato`,
              );
              return prev.map((a) =>
                a.metadata?.id === audit.metadata?.id ? audit : a,
              );
            }
            return [...prev, audit];
          });
        }

        console.log(
          `✅ Import completato: ${backupData.audits.length} audit ripristinati`,
        );
        return { success: true, count: backupData.audits.length };
      } catch (err) {
        console.error("❌ Errore import backup:", err);
        setError(err.message);
        return { success: false, error: err.message };
      }
    },
    [fsProvider],
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
        }),
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
    [audits, currentAuditId],
  );

  /**
   * Inizializza checklist per una norma specifica
   * @param {string} standard - ISO_9001, ISO_14001, ISO_45001
   */
  const initializeChecklist = useCallback(
    async (standard = "ISO_9001") => {
      if (!currentAudit) {
        console.warn("⚠️ No current audit to initialize checklist");
        return false;
      }

      // Mappa standard code → standard_id per API
      const standardIdMap = {
        ISO_9001: 1,
        ISO_9001_2015: 1,
        ISO_14001: 2,
        ISO_14001_2015: 2,
        ISO_45001: 3,
        ISO_45001_2018: 3
      };

      const standardId = standardIdMap[standard];
      if (!standardId) {
        console.warn(`⚠️ Standard ${standard} not recognized`);
        return false;
      }

      // Verifica se checklist già inizializzata
      if (
        currentAudit.checklist?.[standard] &&
        Object.keys(currentAudit.checklist[standard]).length > 0
      ) {
        console.log(`ℹ️ Checklist ${standard} already initialized`);
        return true;
      }

      // Carica checklist dinamicamente da API
      try {
        console.log(`[StorageContext] Caricamento checklist ${standard} da API...`);
        const questions = await fetchChecklistQuestions(standardId);
        
        if (questions.length === 0) {
          console.warn(`⚠️ Nessuna domanda ricevuta per ${standard}`);
          return false;
        }

        const structuredChecklist = buildChecklistStructure(questions);

        // Converti array in oggetto per compatibilità con struttura esistente
        const checklistObj = {};
        structuredChecklist.forEach((clause) => {
          checklistObj[clause.clauseId] = clause;
        });

        const totalQuestions = Object.values(checklistObj).reduce(
          (sum, clause) => sum + (clause.questions?.length || 0),
          0,
        );

        // Aggiorna audit con checklist caricata
        updateCurrentAudit((audit) => {
          const updatedAudit = { ...audit };

          if (!updatedAudit.checklist) {
            updatedAudit.checklist = {};
          }

          updatedAudit.checklist[standard] = checklistObj;
          updatedAudit.metadata.lastModified = new Date().toISOString();
          updatedAudit.metrics.totalQuestions = totalQuestions;

          return updatedAudit;
        });

        console.log(
          `✅ Initialized ${standard} checklist from API (${totalQuestions} questions)`,
        );
        return true;
      } catch (error) {
        console.error("❌ Errore caricamento checklist da API:", error);

        // Fallback: inizializza con struttura vuota
        updateCurrentAudit((audit) => {
          const updatedAudit = { ...audit };

          if (!updatedAudit.checklist) {
            updatedAudit.checklist = {};
          }

          updatedAudit.checklist.ISO_9001 = {};
          updatedAudit.metrics.totalQuestions = 0;

          return updatedAudit;
        });

        return false;
      }
    },
    [currentAudit, updateCurrentAudit],
  );

  // Registra reference globale per useEffect
  useEffect(() => {
    window.__initializeChecklistRef = initializeChecklist;
    return () => {
      delete window.__initializeChecklistRef;
    };
  }, [initializeChecklist]);

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
