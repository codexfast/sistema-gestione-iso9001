/**
 * Report Templates Admin - Assegnazione template per standard (Phase 3.3)
 * Solo admin/auditor. Elenco standard + dropdown template per ciascuno.
 */
import React, { useState, useEffect } from "react";
import apiService from "../services/apiService";
import "./ReportTemplatesAdminPage.css";

const STANDARD_LABELS = {
  1: "ISO 9001",
  2: "ISO 14001",
  3: "ISO 45001",
  6: "ISO 3834-2",
  7: "RDP Mason",
};

const ReportTemplatesAdminPage = ({ onBack }) => {
  const [templates, setTemplates] = useState([]);
  const [standards, setStandards] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tplRes, stdRes] = await Promise.all([
        apiService.get(`/report-templates?scope=audit`),
        apiService.getStandards(),
      ]);
      const tplList = tplRes?.data ?? [];
      const stdList = (stdRes?.data ?? []).filter((s) =>
        [1, 2, 3, 6, 7].includes(s.standard_id)
      );
      setTemplates(Array.isArray(tplList) ? tplList : []);
      setStandards(stdList);
    } catch (err) {
      console.error("Errore caricamento template:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (standardId, templateId) => {
    try {
      setSaving(standardId);
      await apiService.assignReportTemplateToStandard(standardId, templateId);
      setAssignments((prev) => ({ ...prev, [standardId]: templateId }));
    } catch (err) {
      console.error("Errore assegnazione:", err);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="report-templates-admin">
        <p>Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="report-templates-admin">
      <div className="rt-header">
        <button type="button" className="btn-back" onClick={onBack}>
          ← Indietro
        </button>
        <h2>Template report per standard</h2>
        <p className="rt-desc">
          Assegna un template personalizzato a ciascuno standard. Se non assegnato, viene usato il template di sistema.
        </p>
      </div>

      <div className="rt-list">
        {standards.map((std) => (
          <div key={std.standard_id} className="rt-row">
            <span className="rt-std-label">
              {STANDARD_LABELS[std.standard_id] || std.standard_name}
            </span>
            <select
              className="rt-select"
              value={assignments[std.standard_id] ?? ""}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : null;
                if (val) handleAssign(std.standard_id, val);
              }}
              disabled={saving === std.standard_id}
            >
              <option value="">Template di sistema (default)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.is_system ? "(sistema)" : ""}
                </option>
              ))}
            </select>
            {saving === std.standard_id && <span className="rt-saving">Salvataggio...</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportTemplatesAdminPage;
