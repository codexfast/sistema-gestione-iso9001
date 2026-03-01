/**
 * Pending Issues Cascade Component
 * Lista read-only dei rilievi (NC/OSS/NV) carry-over dall'audit precedente.
 * Visibile solo nei re-audit (quando pendingIssues.length > 0).
 * Non modificabile dall'utente — i dati provengono esclusivamente
 * dall'audit precedente dello stesso cliente.
 *
 * Sistema Gestione ISO 9001 - QS Studio
 */

import React from "react";
import { useStorage } from "../contexts/StorageContext";
import "./PendingIssuesCascade.css";

/** Badge colorato per ogni status rilevante */
const STATUS_CONFIG = {
  NC:  { label: "Non Conforme",  cssKey: "nc" },
  OSS: { label: "Osservazione",  cssKey: "oss" },
  NV:  { label: "Non Valutato",  cssKey: "nv" },
};

function PendingIssuesCascade() {
  const { currentAudit } = useStorage();

  if (!currentAudit) return null;

  const issues = currentAudit.pendingIssues || [];

  // Sezione nascosta per i nuovi audit (nessun carry-over)
  if (issues.length === 0) return null;

  const ncCount  = issues.filter((i) => i.originalStatus === "NC").length;
  const ossCount = issues.filter((i) => i.originalStatus === "OSS").length;
  const nvCount  = issues.filter((i) => i.originalStatus === "NV").length;

  return (
    <div className="pending-cascade">
      <div className="pending-header">
        <div>
          <h3>🔁 Rilievi Pendenti</h3>
          <p className="pending-description">
            Rilievi dell&apos;audit precedente da verificare in questo re-audit
          </p>
        </div>
      </div>

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
          const cfg = STATUS_CONFIG[issue.originalStatus] || null;
          return (
            <div
              key={issue.id}
              className={`issue-card${cfg ? ` status-${cfg.cssKey}` : ""}`}
            >
              <div className="issue-header">
                <div className="issue-title-section">
                  <div className="issue-title-row">
                    {cfg && (
                      <span className={`issue-status-badge badge-${cfg.cssKey}`}>
                        {issue.originalStatus}
                      </span>
                    )}
                    {issue.clauseNumber && (
                      <span className="issue-clause">{issue.clauseNumber}</span>
                    )}
                    <h4 className="issue-title">{issue.description}</h4>
                  </div>
                  {issue.fromAuditNumber && (
                    <span className="issue-source">
                      Da audit {issue.fromAuditNumber}
                    </span>
                  )}
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
    </div>
  );
}

export default PendingIssuesCascade;

