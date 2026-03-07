import React, { useState } from "react";
import { useStorage } from "../contexts/StorageContext";
import apiService from "../services/apiService";
import {
  downloadAuditJSON,
  downloadAllAuditsJSON,
  downloadAuditSummaryJSON,
  downloadAuditSummaryCSV,
} from "../utils/exportManager";
import {
  exportAuditToWord,
  exportAuditToFileSystem,
  exportAuditToWorkspace,
} from "../utils/wordExport";
import "./ExportPanel.css";

const ExportPanel = () => {
  const { currentAudit, audits, fsProvider, importBackup } = useStorage();
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [photoMode, setPhotoMode] = useState("link"); // "link" | "preview"
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [pendingExportFn, setPendingExportFn] = useState(null);

  // Development mode - mostra formati avanzati JSON/CSV
  const isDev = process.env.NODE_ENV === "development";

  console.log(
    "ExportPanel - currentAudit:",
    currentAudit ? "presente" : "null"
  );

  const showMessage = (message, type = "success") => {
    setExportMessage({ text: message, type });
    setTimeout(() => setExportMessage(null), 5000);
  };

  const handleExportCurrent = (format) => {
    if (!currentAudit) return;

    switch (format) {
      case "json-full":
        downloadAuditJSON(currentAudit);
        break;
      case "json-summary":
        downloadAuditSummaryJSON(currentAudit);
        break;
      case "csv":
        downloadAuditSummaryCSV(currentAudit);
        break;
      default:
        break;
    }
  };

  // Avvia il dialog di scelta foto, poi esegue la funzione export
  const askPhotoModeAndExport = (exportFn) => {
    setPendingExportFn(() => exportFn);
    setShowPhotoDialog(true);
  };

  const confirmPhotoDialog = async () => {
    setShowPhotoDialog(false);
    if (pendingExportFn) await pendingExportFn(photoMode);
    setPendingExportFn(null);
  };

  const cancelPhotoDialog = () => {
    setShowPhotoDialog(false);
    setPendingExportFn(null);
  };

  const handleExportWord = async () => {
    if (!currentAudit) return;
    askPhotoModeAndExport((mode) => doExportWord(mode));
  };

  const doExportWord = async (mode) => {
    try {
      setIsExporting(true);

      // Fetcha dati live dal server (best-effort, non bloccante)
      const auditForExport = { ...currentAudit };
      const auditId = currentAudit.metadata?.id || currentAudit.id;

      // Fetch rilievi pendenti: usa checkReaudit + getNcResponses (audit_responses reali)
      // La tabella pending_issues non è ancora popolata automaticamente → legge direttamente
      // le risposte NC/OSS/NV dall'audit precedente dello stesso cliente.
      try {
        const clientName = currentAudit.metadata?.clientName;
        const auditUuid  = currentAudit.metadata?.id || null;
        if (clientName) {
          const reauditInfo = await apiService.checkReaudit(clientName, auditUuid);
          if (reauditInfo.has_previous_audit && reauditInfo.last_audit_id) {
            const ncData = await apiService.getNcResponses(reauditInfo.last_audit_id);
            const rawIssues = (ncData.responses || []).filter(i => i.conformity_status !== 'OM');
            if (rawIssues.length > 0) {
              // Normalizza campi per buildPendingIssuesOoxml (wordExportHelpers.js)
              auditForExport.pendingIssues = rawIssues.map(i => ({
                clause:            i.section_code || '',
                description:       i.question_text || `Domanda ${i.question_id}`,
                originAuditNumber: reauditInfo.last_audit_number || `#${reauditInfo.last_audit_id}`,
                status:            'open',
                resolutionNotes:   i.notes || '',
              }));
              console.log(`📋 [EXPORT] ${rawIssues.length} rilievi pendenti da audit_responses`);
            }
          }
        }
      } catch (err) {
        console.warn('[EXPORT] pending issues non disp., uso locali:', err.message);
      }

      // Fetch rilievi ente certificatore
      try {
        const companyId = currentAudit?.metadata?.companyId;
        const standardId = currentAudit?.metadata?.selectedStandards?.includes("ISO_14001") ? 2
          : currentAudit?.metadata?.selectedStandards?.includes("ISO_45001") ? 3 : 1;
        if (companyId) {
          const cfRes = await apiService.get(
            `/companies/${companyId}/certification-findings?standard_id=${standardId}`
          );
          auditForExport.certificationFindings = cfRes.data || [];
          console.log(`📋 [EXPORT] ${auditForExport.certificationFindings.length} rilievi ente certificatore`);
        }
      } catch (err) {
        console.warn('[EXPORT] rilievi ente non disp.:', err.message);
        auditForExport.certificationFindings = [];
      }

      // Fetch allegati dal server e normalizza in formato wordExport (camelCase)
      try {
        const rawAtts = await apiService.getAttachments(auditId);
        // La risposta può essere array diretto o { data: [...] } a seconda del backend
        const serverAtts = Array.isArray(rawAtts) ? rawAtts : (rawAtts?.data ?? rawAtts?.attachments ?? []);
        if (serverAtts?.length > 0) {
          // Normalizza snake_case → camelCase atteso da wordExport.js
          const normalized = serverAtts.map(att => ({
            id: att.attachment_id,
            questionId: att.question_id,          // usato da createClauseTable per filtro
            name: att.file_name,
            fileName: att.file_name,
            fileSize: att.file_size,
            mimeType: att.mime_type,
            category: att.category,
            description: att.description,
            serverAttachmentId: att.attachment_id
          }));
          // Merge: priorità allegati server; locali solo se question non ha nulla dal server
          const serverQuestionIds = new Set(normalized.map(a => a.questionId).filter(Boolean));
          const localOnly = (auditForExport.attachments || []).filter(
            a => !serverQuestionIds.has(a.questionId)
          );
          auditForExport.attachments = [...normalized, ...localOnly];
          console.log(`📎 [EXPORT] ${normalized.length} allegati da server + ${localOnly.length} solo locali`);
        }
      } catch (err) {
        console.warn('[EXPORT] allegati server non disp., uso locali:', err.message);
      }

      // Costruisce getViewUrl con token esplicito (encodeURIComponent per sicurezza)
      const rawToken = apiService.getToken();
      const getViewUrl = rawToken
        ? (id) => `${apiService.baseUrl}/attachments/${id}/view?token=${encodeURIComponent(rawToken)}`
        : null;

      const fileName = await exportAuditToWord(auditForExport, getViewUrl, { photoMode: mode });
      showMessage(`✅ Report Word generato: ${fileName}`, "success");
    } catch (error) {
      console.error("Errore export Word:", error);
      showMessage(`❌ Errore: ${error.message}`, "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportToFileSystem = async () => {
    if (!currentAudit) return;
    askPhotoModeAndExport((mode) => doExportToFileSystem(mode));
  };

  const doExportToFileSystem = async (mode) => {

    // Se fsProvider è pronto, usa exportAuditToWorkspace (struttura ISO 9001)
    if (fsProvider?.ready()) {
      try {
        setIsExporting(true);
        const result = await exportAuditToWorkspace(currentAudit, fsProvider);

        // Notifica diversa se fallback Android
        if (result.fallback) {
          showMessage(
            `📱 Android: file salvato in Download (${result.fileName})`,
            "info"
          );
        } else {
          showMessage(
            `✅ Report salvato in workspace: ${result.fileName}`,
            "success"
          );
        }
      } catch (error) {
        console.error("Errore salvataggio workspace:", error);
        showMessage(`❌ Errore: ${error.message}`, "error");
      } finally {
        setIsExporting(false);
      }
      return;
    }

    // Fallback: chiedi all'utente di selezionare cartella (vecchio comportamento)
    try {
      setIsExporting(true);
      const result = await exportAuditToFileSystem(currentAudit);

      // Notifica diversa se fallback Android
      if (result.fallback) {
        showMessage(
          `📱 Android: file salvato in Download (${result.fileName})`,
          "info"
        );
      } else {
        showMessage(`✅ File salvato in: ${result.path}`, "success");
      }
    } catch (error) {
      console.error("Errore salvataggio file system:", error);
      if (error.message.includes("annullato")) {
        showMessage("ℹ️ Salvataggio annullato", "info");
      } else {
        showMessage(`❌ Errore: ${error.message}`, "error");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAll = () => {
    downloadAllAuditsJSON(audits);
  };

  const handleImportBackup = async () => {
    // Crea input file nascosto
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        setIsImporting(true);
        showMessage("📥 Importazione backup in corso...", "info");

        // Leggi file JSON
        const text = await file.text();
        const backupData = JSON.parse(text);

        // Importa tramite StorageContext
        const result = await importBackup(backupData);

        if (result.success) {
          showMessage(
            `✅ Import completato: ${result.count} audit ripristinati`,
            "success"
          );
        } else {
          showMessage(`❌ Errore import: ${result.error}`, "error");
        }
      } catch (error) {
        console.error("Errore lettura backup:", error);
        showMessage(`❌ File non valido: ${error.message}`, "error");
      } finally {
        setIsImporting(false);
      }
    };

    input.click();
  };

  return (
    <div className="export-panel">
      {/* Dialog scelta modalità foto */}
      {showPhotoDialog && (
        <div className="photo-dialog-overlay">
          <div className="photo-dialog">
            <h4>Modalità foto nel report</h4>
            <p className="photo-dialog-desc">Come vuoi includere le foto degli allegati nel documento Word?</p>
            <div className="photo-options">
              <label className={`photo-option ${photoMode === "link" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="photoMode"
                  value="link"
                  checked={photoMode === "link"}
                  onChange={() => setPhotoMode("link")}
                />
                <div className="photo-option-content">
                  <span className="photo-option-icon">🔗</span>
                  <div>
                    <strong>Solo link</strong>
                    <p>Testo cliccabile al file originale. Documento più leggero.</p>
                  </div>
                </div>
              </label>
              <label className={`photo-option ${photoMode === "preview" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="photoMode"
                  value="preview"
                  checked={photoMode === "preview"}
                  onChange={() => setPhotoMode("preview")}
                />
                <div className="photo-option-content">
                  <span className="photo-option-icon">🖼️</span>
                  <div>
                    <strong>Anteprima + link</strong>
                    <p>Miniatura incorporata (200px) + link al file originale.</p>
                  </div>
                </div>
              </label>
            </div>
            <div className="photo-dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={cancelPhotoDialog}>Annulla</button>
              <button type="button" className="btn btn-word" onClick={confirmPhotoDialog}>Genera Report</button>
            </div>
          </div>
        </div>
      )}

      {/* Export Message Notification */}
      {exportMessage && (
        <div className={`export-notification ${exportMessage.type}`}>
          {exportMessage.text}
        </div>
      )}

      <div className="export-sections">
        {/* Export Audit Corrente - WORD */}
        <div className="export-section export-word-section">
          <h4>📄 Report Word{currentAudit?.metadata?.selectedStandards?.length > 0
            ? ` (${currentAudit.metadata.selectedStandards.join(' + ')})`
            : ''}</h4>
          {!currentAudit ? (
            <p className="export-info">
              Seleziona un audit per abilitare export
            </p>
          ) : (
            <>
              <p className="export-info">
                Genera report professionale per{" "}
                <strong>{currentAudit.metadata.auditNumber}</strong> -{" "}
                {currentAudit.metadata.clientName}
              </p>
              <div className="export-buttons">
                <button
                  onClick={handleExportWord}
                  disabled={isExporting}
                  className="btn btn-word"
                  title="Scarica report Word (browser download)"
                >
                  {isExporting ? "⏳ Generazione..." : "📄 Genera Report Word"}
                </button>
                <button
                  onClick={handleExportToFileSystem}
                  disabled={isExporting}
                  className="btn btn-filesystem"
                  title={
                    fsProvider?.ready()
                      ? "Salva in workspace collegato (Report/)"
                      : "Salva in cartella organizzata (File System Access API)"
                  }
                >
                  {isExporting
                    ? "⏳ Salvataggio..."
                    : fsProvider?.ready()
                    ? "✅ Salva in Workspace"
                    : "💾 Salva in File System"}
                </button>
              </div>
              <p className="export-hint">
                {fsProvider?.ready() ? (
                  <span>
                    <strong>✅ Workspace collegato:</strong> Report salvato in{" "}
                    <code>Report/{currentAudit.metadata.clientName}/</code>
                  </span>
                ) : (
                  <span>
                    <strong>💡 Suggerimento:</strong> Collega workspace in
                    Impostazioni per salvataggio automatico
                  </span>
                )}
              </p>
            </>
          )}
        </div>

        {/* Export JSON/CSV - Solo Development Mode */}
        {isDev && (
          <div className="export-section">
            <h4>Formato Dati (JSON/CSV)</h4>
            {!currentAudit ? (
              <p className="export-info">
                Seleziona un audit per abilitare export
              </p>
            ) : (
              <>
                <p className="export-info">
                  Esporta <strong>{currentAudit.metadata.auditNumber}</strong> -{" "}
                  {currentAudit.metadata.clientName}
                </p>
                <div className="export-buttons">
                  <button
                    onClick={() => handleExportCurrent("json-full")}
                    className="btn btn-primary"
                  >
                    📊 JSON Completo
                  </button>
                  <button
                    onClick={() => handleExportCurrent("json-summary")}
                    className="btn btn-secondary"
                  >
                    📋 JSON Summary
                  </button>
                  <button
                    onClick={() => handleExportCurrent("csv")}
                    className="btn btn-success"
                  >
                    📈 CSV Summary
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Export Tutti */}
        <div className="export-section">
          <h4>Backup Completo</h4>
          <p className="export-info">
            Esporta tutti gli audit ({audits.length} totali) in un unico file
            JSON
          </p>
          <div className="export-buttons">
            <button
              onClick={handleExportAll}
              disabled={audits.length === 0}
              className="btn btn-warning"
            >
              💾 Backup Tutti gli Audit
            </button>
            <button
              onClick={handleImportBackup}
              disabled={isImporting}
              className="btn btn-info"
              title="Importa backup JSON per ripristinare audit"
            >
              {isImporting ? "⏳ Importazione..." : "📥 Importa Backup"}
            </button>
          </div>
        </div>

        {/* Info Export */}
        <div className="export-info-section">
          <h4>ℹ️ Formati Export</h4>
          <ul>
            <li>
              <strong>Report Word:</strong> Documento professionale conforme ISO
              9001:2015 con intestazione, dati generali, checklist completa e
              rilievi emergenti
            </li>
            <li>
              <strong>Salva in Workspace:</strong> Organizzazione automatica in
              cartelle strutturate per anno e cliente nella cartella workspace
              collegata
            </li>
            <li>
              <strong>Backup Completo:</strong> Tutti gli audit in formato JSON
              per ripristino completo del sistema
            </li>
            <li>
              <strong>Importa Backup:</strong> Ripristina audit da file JSON di
              backup (utile per sincronizzare dati tra dispositivi)
            </li>
            {isDev && (
              <>
                <li>
                  <strong>JSON Completo:</strong> Include tutti i dati audit
                  (checklist, NC, evidenze, report)
                </li>
                <li>
                  <strong>JSON Summary:</strong> Contiene solo metriche, NC
                  summary e informazioni base
                </li>
                <li>
                  <strong>CSV Summary:</strong> Formato tabellare per
                  Excel/LibreOffice con metriche e NC
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;
