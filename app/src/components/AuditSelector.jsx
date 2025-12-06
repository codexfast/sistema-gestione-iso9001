/**
 * Audit Selector Component
 * Dropdown per selezione, creazione, eliminazione audit
 * Sistema Gestione ISO 9001 - QS Studio
 */

import React, { useState } from "react";
import { useStorage } from "../contexts/StorageContext";
import { getNextAuditNumber, sortAuditsByNumber } from "../utils/auditUtils";
import WorkspaceManager from "./WorkspaceManager";
import "./AuditSelector.css";

function AuditSelector() {
  const {
    audits,
    currentAudit,
    currentAuditId,
    switchAudit,
    createAudit,
    deleteAudit,
    isSaving,
    fsProvider,
    deviceInfo,
  } = useStorage();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [workspaceExpanded, setWorkspaceExpanded] = useState(false);

  const isMobile = deviceInfo?.isMobile;

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

  const handleCreateAudit = () => {
    setShowCreateModal(true);
  };

  const handleDeleteAudit = () => {
    if (currentAudit) {
      setShowDeleteConfirm(true);
    }
  };

  const confirmDelete = () => {
    if (currentAudit) {
      deleteAudit(currentAuditId);
      setShowDeleteConfirm(false);
    }
  };

  // === RENDER ===

  if (audits.length === 0) {
    return (
      <div className="audit-selector empty">
        <p>Nessun audit disponibile</p>
        <button onClick={handleCreateAudit} className="btn btn-primary">
          ➕ Crea Primo Audit
        </button>
      </div>
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

          <button
            onClick={handleCreateAudit}
            className="btn btn-icon btn-success"
            title="Crea nuovo audit"
          >
            ➕
          </button>

          <button
            onClick={handleDeleteAudit}
            className="btn btn-icon btn-danger"
            title="Elimina audit corrente"
            disabled={!currentAudit}
          >
            🗑️
          </button>
        </div>

        {isSaving && <span className="save-indicator">💾 Salvataggio...</span>}
      </div>

      {/* Workspace Manager Section - Sempre visibile */}
      <div className="workspace-section">
        <button
          className="workspace-toggle"
          onClick={() => setWorkspaceExpanded(!workspaceExpanded)}
        >
          <span>⚙️ Impostazioni Workspace</span>
          <span className="toggle-arrow">{workspaceExpanded ? "▼" : "▶"}</span>
        </button>

        {workspaceExpanded && (
          <div className="workspace-content">
            <WorkspaceManager compact={false} audit={currentAudit} />
          </div>
        )}
      </div>

      {/* Alert compatto se workspace non connesso - SOLO DESKTOP, meno invasivo */}
      {!isMobile && currentAudit && !fsProvider?.ready() && (
        <div className="alert alert-info-compact">
          <span className="alert-icon">💾</span>
          <span className="alert-text">
            Salvataggio locale attivo (localStorage).
            <button
              className="btn-link"
              onClick={() => setWorkspaceExpanded(true)}
            >
              Connetti cartella per backup su file
            </button>
          </span>
        </div>
      )}

      {currentAudit && (
        <div className="audit-info-bar">
          <div className="audit-info-item">
            <strong>Data Audit:</strong>{" "}
            {(() => {
              const dateStr =
                currentAudit.metadata?.generalData?.auditDate ||
                currentAudit.metadata?.auditDate;
              if (!dateStr) return "Non specificata";
              const date = new Date(dateStr);
              return isNaN(date.getTime())
                ? "Non valida"
                : date.toLocaleDateString("it-IT");
            })()}
          </div>
          <div className="audit-info-item">
            <strong>Auditor:</strong>{" "}
            {currentAudit.metadata?.generalData?.auditors?.[0] ||
              currentAudit.metadata?.auditor ||
              currentAudit.metadata?.auditorName ||
              "Non specificato"}
          </div>
          <div className="audit-info-item standards-info">
            <strong>Norme:</strong>{" "}
            <div className="standards-badges">
              {(currentAudit.metadata.selectedStandards || []).map((std) => {
                // Determina categoria dal codice standard
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
          onClose={() => setShowCreateModal(false)}
          onCreate={createAudit}
        />
      )}

      {/* Modal Conferma Eliminazione */}
      {showDeleteConfirm && (
        <ConfirmDeleteModal
          audit={currentAudit}
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

// === MODAL CREAZIONE AUDIT ===

function CreateAuditModal({ audits, onClose, onCreate }) {
  const currentYear = new Date().getFullYear();
  const nextNumber = getNextAuditNumber(audits, currentYear);

  const [formData, setFormData] = useState({
    auditNumber: nextNumber,
    clientName: "",
    auditDate: new Date().toISOString().split("T")[0],
    auditorName: "",
    norms: ["ISO_9001"],
  });

  const [errors, setErrors] = useState({});

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

    onCreate(formData);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Crea Nuovo Audit</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

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
              className={`form-control ${errors.clientName ? "error" : ""}`}
              placeholder="es. Acme Industries SpA"
            />
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

// === MODAL CONFERMA ELIMINAZIONE ===

function ConfirmDeleteModal({ audit, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-content modal-small"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Conferma Eliminazione</h2>
          <button className="modal-close" onClick={onCancel}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="warning-text">
            ⚠️ Sei sicuro di voler eliminare questo audit?
          </p>
          <div className="audit-details">
            <p>
              <strong>Numero:</strong> {audit.metadata.auditNumber}
            </p>
            <p>
              <strong>Cliente:</strong> {audit.metadata.clientName}
            </p>
            <p>
              <strong>Data:</strong>{" "}
              {new Date(audit.metadata.auditDate).toLocaleDateString("it-IT")}
            </p>
          </div>
          <p className="danger-text">
            Questa operazione non può essere annullata.
          </p>
        </div>

        <div className="modal-footer">
          <button onClick={onCancel} className="btn btn-secondary">
            Annulla
          </button>
          <button onClick={onConfirm} className="btn btn-danger">
            🗑️ Elimina
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuditSelector;
