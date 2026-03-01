/**
 * Pending Issues Cascade Component
 * Lista read-only dei rilievi (NC/OSS/NV) carry-over dall'audit precedente.
 *
 * Flusso: per ogni audit, chiama checkReaudit(clientName, currentUuid) per trovare
 * l'audit precedente dello stesso cliente con NC/OSS/NV, poi getNcResponses(lastAuditId)
 * per ottenere la lista rilievi. Sezione nascosta se non esiste audit precedente.
 *
 * Sistema Gestione ISO 9001 - QS Studio
 */

import React, { useState, useEffect } from "react";
import { useStorage } from "../contexts/StorageContext";
import apiService from "../services/apiService";
import "./PendingIssuesCascade.css";

/** Badge colorato per ogni status rilevante */
const STATUS_CONFIG = {
  NC:  { label: "Non Conforme", cssKey: "nc" },
  OSS: { label: "Osservazione",  cssKey: "oss" },
  NV:  { label: "Non Valutato",  cssKey: "nv" },
};

function PendingIssuesCascade() {
  const { currentAudit } = useStorage();

  const [issues, setIssues]           = useState([]);
  const [sourceAuditNumber, setSourceAuditNumber] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);

  const auditUuid  = currentAudit?.id;                  // UUID (per escludere se stesso)
  const clientName = currentAudit?.metadata?.clientName;

  useEffect(() => {
    if (!clientName || !auditUuid) {
      setIssues([]);
      setSourceAuditNumber(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // 1. Trova l'audit precedente con NC/OSS/NV per lo stesso cliente
        const reauditInfo = await apiService.checkReaudit(clientName, auditUuid);

        if (!reauditInfo.has_previous_audit || !reauditInfo.last_audit_id) {
          if (!cancelled) {
            setIssues([]);
            setSourceAuditNumber(null);
          }
          return;
        }

        // 2. Recupera le risposte NC/OSS/NV dell'audit precedente
        const ncData = await apiService.getNcResponses(reauditInfo.last_audit_id);

        if (!cancelled) {
          setIssues(ncData.responses || []);
          setSourceAuditNumber(reauditInfo.last_audit_number || `#${reauditInfo.last_audit_id}`);
        }
      } catch (err) {
        console.error('[PendingIssues] Errore:', err?.status, err?.message, err);
        if (!cancelled) {
          setError(`Impossibile caricare i rilievi pendenti (${err?.status || 'NET'}: ${err?.message || err})`);
          setIssues([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [clientName, auditUuid]);

  // Sezione nascosta se nessun rilievo (nuovo audit o cliente senza storico)
  if (!loading && issues.length === 0 && !error) return null;

  const ncCount  = issues.filter((r) => r.conformity_status === "NC").length;
  const ossCount = issues.filter((r) => r.conformity_status === "OSS").length;
  const nvCount  = issues.filter((r) => r.conformity_status === "NV").length;

  return (
    <div className="pending-cascade">
      <div className="pending-header">
        <div>
          <h3>🔁 Rilievi Pendenti</h3>
          <p className="pending-description">
            {sourceAuditNumber
              ? `Rilievi dell'audit ${sourceAuditNumber} da verificare in questo re-audit`
              : "Rilievi dell'audit precedente da verificare in questo re-audit"}
          </p>
        </div>
      </div>

      {loading && (
        <div className="pending-loading">⏳ Caricamento rilievi pendenti...</div>
      )}

      {error && (
        <div className="pending-error">⚠️ {error}</div>
      )}

      {!loading && !error && issues.length > 0 && (
        <>
          <div className="pending-stats">
            <div className="stat-card">
              <span className="stat-value">{issues.length}</span>
              <span className="stat-label">Totali</span>
            </div>
            {ncCount > 0 && (
              <div className="stat-card stat-nc">
                <span className="stat-value">{ncCount}</span>
                <span className="stat-label">NC</span>
              </div>
            )}
            {ossCount > 0 && (
              <div className="stat-card stat-oss">
                <span className="stat-value">{ossCount}</span>
                <span className="stat-label">OSS</span>
              </div>
            )}
            {nvCount > 0 && (
              <div className="stat-card stat-nv">
                <span className="stat-value">{nvCount}</span>
                <span className="stat-label">NV</span>
              </div>
            )}
          </div>

          <div className="issues-list">
            {issues.map((issue) => {
              const cfg = STATUS_CONFIG[issue.conformity_status] || null;
              const clauseLabel = issue.section_code || null;
              const description = issue.question_text || clauseLabel || `Risposta #${issue.response_id}`;
              return (
                <div
                  key={issue.response_id}
                  className={`issue-card${cfg ? ` status-${cfg.cssKey}` : ""}`}
                >
                  <div className="issue-header">
                    <div className="issue-title-section">
                      <div className="issue-title-row">
                        {cfg && (
                          <span className={`issue-status-badge badge-${cfg.cssKey}`}>
                            {issue.conformity_status}
                          </span>
                        )}
                        {clauseLabel && (
                          <span className="issue-clause">{clauseLabel}</span>
                        )}
                        <h4 className="issue-title">{description}</h4>
                      </div>
                    </div>
                  </div>
                  {issue.notes && (
                    <div className="issue-notes">
                      <strong>Note:</strong> {issue.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default PendingIssuesCascade;


