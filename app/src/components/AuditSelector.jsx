/**
 * Audit Selector Component
 * Dropdown per selezione, creazione, eliminazione audit
 * Sistema Gestione ISO 9001 - QS Studio
 */

import React, { useState } from "react";
import { useStorage } from "../contexts/StorageContext";
import { getNextAuditNumber, sortAuditsByNumber } from "../utils/auditUtils";
import apiService from "../services/apiService";
import "./AuditSelector.css";

function AuditSelector() {
  const {
    audits,
    currentAudit,
    currentAuditId,
    switchAudit,
    createAudit,
    isSaving,
  } = useStorage();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isReauditMode, setIsReauditMode] = useState(false);

  // Ordina audit per numero (più recente prima) - filtro audit validi
  const validAudits = audits.filter((audit) => audit && audit.metadata);
  const sortedAudits = sortAuditsByNumber(validAudits, false);

  // === HANDLERS ===

  const handleAuditChange = (e) => {
    const auditId = e.target.value;
    if (auditId) {
      switchAudit(auditId);
    }
  };

  const handleCreateNewAudit = () => {
    setIsReauditMode(false);
    setShowCreateModal(true);
  };

  const handleCreateReAudit = () => {
    setIsReauditMode(true);
    setShowCreateModal(true);
  };



  // === RENDER ===

  if (audits.length === 0) {
    return (
      <>
        <div className="audit-selector empty">
          <p>Nessun audit disponibile</p>
          <button onClick={handleCreateNewAudit} className="btn btn-primary">
            ➕ Crea Primo Audit
          </button>
        </div>

        {/* Modal Creazione - NECESSARIO anche quando lista vuota */}
        {showCreateModal && (
          <CreateAuditModal
            audits={audits}
            currentAudit={null}
            isReaudit={false}
            onClose={() => setShowCreateModal(false)}
            onCreate={createAudit}
          />
        )}
      </>
    );
  }

  return (
    <div className="audit-selector">
      <div className="audit-selector-header">
        <label htmlFor="audit-select">Audit Corrente:</label>

        <div className="audit-selector-controls">
          <select
            id="audit-select"
            value={currentAuditId || ""}
            onChange={handleAuditChange}
            className="audit-dropdown"
          >
            {/* Opzione vuota quando nessun audit selezionato */}
            <option value="">-- Seleziona un audit --</option>

            {sortedAudits.map((audit) => {
              const auditId = audit.metadata?.id || audit.id;
              return (
                <option key={auditId} value={auditId}>
                  {audit.metadata.auditNumber} - {audit.metadata.clientName} (
                  {audit.metadata.status})
                </option>
              );
            })}
          </select>

          {/* Due pulsanti distinti: Nuovo Audit vs Re-Audit */}
          <button
            onClick={handleCreateNewAudit}
            className="btn btn-icon btn-success"
            title="Crea nuovo audit (nuova azienda)"
            disabled={currentAudit !== null}
          >
            ➕ Nuovo
          </button>
          
          <button
            onClick={handleCreateReAudit}
            className="btn btn-icon btn-primary"
            title="Re-audit azienda selezionata"
            disabled={currentAudit === null}
          >
            🔄 Re-Audit
          </button>
        </div>

        {isSaving && <span className="save-indicator">💾 Salvataggio...</span>}
      </div>



      {currentAudit && (
        <div className="audit-info-bar">
          <div className="audit-info-item standards-info">
            <strong>Norme:</strong>{" "}
            <div className="standards-badges">
              {(currentAudit.metadata.selectedStandards || []).map((std) => {
                const category = std.includes("9001")
                  ? "quality"
                  : std.includes("14001")
                  ? "environment"
                  : std.includes("45001")
                  ? "safety"
                  : "other";
                const displayName = std
                  .replace("ISO_", "ISO ")
                  .replace("_", ":");
                return (
                  <span
                    key={std}
                    className={`standard-badge-small category-${category}`}
                  >
                    {displayName}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="audit-info-item">
            <strong>Completamento:</strong>{" "}
            {currentAudit.metrics.completionPercentage}%
          </div>
        </div>
      )}

      {/* Modal Creazione Audit */}
      {showCreateModal && (
        <CreateAuditModal
          audits={audits}
          currentAudit={currentAudit}
          isReaudit={isReauditMode}
          onClose={() => setShowCreateModal(false)}
          onCreate={createAudit}
        />
      )}


    </div>
  );
}

// === MODAL CREAZIONE AUDIT ===

function CreateAuditModal({ audits, currentAudit, isReaudit, onClose, onCreate }) {
  const currentYear = new Date().getFullYear();
  const nextNumber = getNextAuditNumber(audits, currentYear);

  // Pre-popola clientName se re-audit
  const initialClientName = isReaudit && currentAudit 
    ? currentAudit.metadata.clientName 
    : "";

  const [formData, setFormData] = useState({
    auditNumber: nextNumber,
    clientName: initialClientName,
    auditDate: new Date().toISOString().split("T")[0],
    auditorName: "",
    norms: ["ISO_9001"],
  });

  const [errors, setErrors] = useState({});
  const [pendingInfo, setPendingInfo] = useState(null); // { count, lastAuditId }

  // Se re-audit, verifica pending issues all'apertura modal
  React.useEffect(() => {
    if (isReaudit && currentAudit) {
      checkPendingIssues(currentAudit);
    }
  }, [isReaudit, currentAudit]);

  const checkPendingIssues = async (audit) => {
    const clientName = audit?.metadata?.clientName || audit?.client_name;
    if (!clientName) return;

    try {
      const result = await apiService.checkReaudit(clientName);
      if (result.has_previous_audit && result.pending_count > 0) {
        // Carica il dettaglio NC/OSS/OM dall'ultimo audit
        let issues = [];
        try {
          const ncResult = await apiService.getNcResponses(result.last_audit_id);
          issues = ncResult.responses || [];
        } catch (err) {
          console.warn('[Re-Audit] getNcResponses fallito (non bloccante):', err.message);
        }

        setPendingInfo({
          count: result.pending_count,
          lastAuditId: result.last_audit_id,
          lastAuditDate: result.last_audit_date,
          lastAuditNumber: result.last_audit_number,
          issues
        });
      } else {
        setPendingInfo(null);
      }
    } catch (err) {
      // Errore non bloccante: il modal si apre comunque
      console.warn('[Re-Audit] check-reaudit fallito:', err.message);
      setPendingInfo(null);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleNormToggle = (norm) => {
    setFormData((prev) => ({
      ...prev,
      norms: prev.norms.includes(norm)
        ? prev.norms.filter((n) => n !== norm)
        : [...prev.norms, norm],
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.clientName.trim()) {
      newErrors.clientName = "Nome cliente obbligatorio";
    }

    if (!formData.auditorName.trim()) {
      newErrors.auditorName = "Nome auditor obbligatorio";
    }

    if (formData.norms.length === 0) {
      newErrors.norms = "Selezionare almeno una norma";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Re-audit: propaga rilievi pendenti dell'audit precedente nel nuovo audit
    const submitData = { ...formData };
    if (isReaudit && pendingInfo?.issues?.length > 0) {
      submitData.pendingIssues = pendingInfo.issues.map((issue) => ({
        id: `issue_${issue.response_id}`,
        description: issue.question_text || issue.requirement_reference || `Domanda ${issue.question_id}`,
        notes: issue.notes || '',
        fromAuditNumber: pendingInfo.lastAuditNumber || `#${pendingInfo.lastAuditId}`,
        originalStatus: issue.conformity_status,
        clauseNumber: issue.clause_number || issue.requirement_reference || '',
        sourceResponseId: issue.response_id,
        resolved: false,
        createdDate: new Date().toISOString(),
      }));
    }

    onCreate(submitData);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isReaudit ? "🔄 Re-Audit Azienda" : "➕ Crea Nuovo Audit"}</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Sezione rilievi pendenti (solo re-audit) */}
        {isReaudit && pendingInfo && pendingInfo.count > 0 && (
          <div className="pending-issues-section">
            <div className="pending-issues-header">
              <span className="pending-issues-icon">⚠️</span>
              <strong>
                {pendingInfo.count} rilievi pendenti dall'ultimo audit
              </strong>
              {pendingInfo.lastAuditDate && (
                <span className="pending-issues-date">
                  ({new Date(pendingInfo.lastAuditDate).toLocaleDateString('it-IT')})
                </span>
              )}
            </div>

            {pendingInfo.issues && pendingInfo.issues.length > 0 ? (
              <ul className="pending-issues-list">
                {pendingInfo.issues.map((issue) => (
                  <li key={issue.response_id} className={`pending-issue-item status-${issue.conformity_status?.toLowerCase()}`}>
                    <span className={`pending-issue-badge badge-${issue.conformity_status?.toLowerCase()}`}>
                      {issue.conformity_status}
                    </span>
                    <span className="pending-issue-ref">
                      {issue.clause_number || issue.requirement_reference || `Q${issue.question_id}`}
                    </span>
                    <span className="pending-issue-text">
                      {issue.question_text || issue.notes || '—'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="pending-issues-loading">⏳ Caricamento dettagli...</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label htmlFor="auditNumber">Numero Audit</label>
            <input
              type="text"
              id="auditNumber"
              name="auditNumber"
              value={formData.auditNumber}
              onChange={handleChange}
              disabled
              className="form-control"
            />
            <small className="form-hint">Generato automaticamente</small>
          </div>

          <div className="form-group">
            <label htmlFor="clientName">Nome Cliente *</label>
            <input
              type="text"
              id="clientName"
              name="clientName"
              value={formData.clientName}
              onChange={handleChange}
              disabled={isReaudit}
              className={`form-control ${errors.clientName ? "error" : ""} ${isReaudit ? "readonly" : ""}`}
              placeholder={isReaudit ? "Azienda da re-auditare" : "es. Acme Industries SpA"}
            />
            {isReaudit && (
              <small className="form-hint">📌 Azienda selezionata (non modificabile)</small>
            )}
            {errors.clientName && (
              <span className="error-message">{errors.clientName}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="auditDate">Data Audit *</label>
            <input
              type="date"
              id="auditDate"
              name="auditDate"
              value={formData.auditDate}
              onChange={handleChange}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="auditorName">Auditor *</label>
            <input
              type="text"
              id="auditorName"
              name="auditorName"
              value={formData.auditorName}
              onChange={handleChange}
              className={`form-control ${errors.auditorName ? "error" : ""}`}
              placeholder="es. Mario Rossi"
            />
            {errors.auditorName && (
              <span className="error-message">{errors.auditorName}</span>
            )}
          </div>

          <div className="form-group">
            <label>Norme Applicabili *</label>
            <div className="checkbox-group">
              <label key="ISO_9001" className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.norms.includes("ISO_9001")}
                  onChange={() => handleNormToggle("ISO_9001")}
                />
                <span>ISO 9001:2015 (Qualità)</span>
              </label>
              <label key="ISO_14001" className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.norms.includes("ISO_14001")}
                  onChange={() => handleNormToggle("ISO_14001")}
                />
                <span>ISO 14001:2015 (Ambiente)</span>
              </label>
              <label key="ISO_45001" className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.norms.includes("ISO_45001")}
                  onChange={() => handleNormToggle("ISO_45001")}
                />
                <span>ISO 45001:2018 (Sicurezza)</span>
              </label>
            </div>
            {errors.norms && (
              <span className="error-message">{errors.norms}</span>
            )}
          </div>
        </form>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Annulla
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="btn btn-primary"
          >
            ✓ Crea Audit
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuditSelector;
