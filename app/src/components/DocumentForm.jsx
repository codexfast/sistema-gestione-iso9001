/**
 * DocumentForm - Modale per creazione e modifica documenti SGQ
 * Usato da DocumentRegistry
 */

import React, { useState, useEffect } from "react";
import apiService from "../services/apiService";
import "./DocumentForm.css";

const DOC_TYPES = [
  { value: "procedura",       label: "Procedura" },
  { value: "istruzione",      label: "Istruzione operativa" },
  { value: "modulo",          label: "Modulo / Registrazione" },
  { value: "manuale",         label: "Manuale" },
  { value: "qualifica",       label: "Qualifica personale" },
  { value: "wps",             label: "WPS (Procedura saldatura)" },
  { value: "wpqr",            label: "WPQR (Qualifica procedura)" },
  { value: "dichiarazione_ce",label: "Dichiarazione CE" },
  { value: "taratura",        label: "Certificato taratura" },
  { value: "altro",           label: "Altro" },
];

const DOC_STATUSES = [
  { value: "vigente",          label: "Vigente" },
  { value: "in_revisione",     label: "In revisione" },
  { value: "in_approvazione",  label: "In approvazione" },
  { value: "obsoleto",         label: "Obsoleto" },
];

// Converte data ISO ("2025-12-31T00:00:00.000Z") in formato YYYY-MM-DD per input[type=date]
function toDateInput(val) {
  if (!val) return "";
  return val.substring(0, 10);
}

function DocumentForm({ doc, companies, standards, onSave, onClose }) {
  const isEdit = !!doc;

  const [form, setForm] = useState({
    doc_type:        doc?.doc_type        || "procedura",
    doc_code:        doc?.doc_code        || "",
    title:           doc?.title           || "",
    revision:        doc?.revision        || "",
    status:          doc?.status          || "vigente",
    issue_date:      toDateInput(doc?.issue_date),
    expiry_date:     toDateInput(doc?.expiry_date),
    responsible:     doc?.responsible     || "",
    retention_years: doc?.retention_years || "",
    standard_id:     doc?.standard_id     || "",
    clause_ref:      doc?.clause_ref      || "",
    company_id:      doc?.company_id      || "",
    notes:           doc?.notes           || "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Chiudi con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Il titolo è obbligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        retention_years: form.retention_years ? parseInt(form.retention_years) : null,
        standard_id:     form.standard_id     ? parseInt(form.standard_id)     : null,
        company_id:      form.company_id       ? parseInt(form.company_id)      : null,
        issue_date:      form.issue_date       || null,
        expiry_date:     form.expiry_date      || null,
        doc_code:        form.doc_code.trim()  || null,
        revision:        form.revision.trim()  || null,
        responsible:     form.responsible.trim() || null,
        clause_ref:      form.clause_ref.trim() || null,
        notes:           form.notes.trim()     || null,
      };
      if (isEdit) {
        await apiService.updateDocument(doc.id, payload);
      } else {
        await apiService.createDocument(payload);
      }
      onSave();
    } catch (err) {
      setError(err.message || "Errore durante il salvataggio.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="docform-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="docform-modal">
        <div className="docform-header">
          <h3>{isEdit ? "Modifica documento" : "Nuovo documento"}</h3>
          <button className="docform-close" onClick={onClose} aria-label="Chiudi">✕</button>
        </div>

        <form className="docform-body" onSubmit={handleSubmit} noValidate>

          {/* Tipo e Codice */}
          <div className="docform-row">
            <div className="docform-field">
              <label>Tipo documento *</label>
              <select value={form.doc_type} onChange={handleChange("doc_type")} required>
                {DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="docform-field docform-field-sm">
              <label>Codice</label>
              <input
                type="text"
                placeholder="es. PG-01, WPS-141-001"
                value={form.doc_code}
                onChange={handleChange("doc_code")}
              />
            </div>
          </div>

          {/* Titolo */}
          <div className="docform-field">
            <label>Titolo *</label>
            <input
              type="text"
              placeholder="Titolo documento"
              value={form.title}
              onChange={handleChange("title")}
              required
              autoFocus
            />
          </div>

          {/* Revisione e Stato */}
          <div className="docform-row">
            <div className="docform-field docform-field-sm">
              <label>Revisione</label>
              <input
                type="text"
                placeholder="es. Rev.2, 0"
                value={form.revision}
                onChange={handleChange("revision")}
              />
            </div>
            <div className="docform-field">
              <label>Stato</label>
              <select value={form.status} onChange={handleChange("status")}>
                {DOC_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date */}
          <div className="docform-row">
            <div className="docform-field">
              <label>Data emissione</label>
              <input type="date" value={form.issue_date} onChange={handleChange("issue_date")} />
            </div>
            <div className="docform-field">
              <label>Data scadenza</label>
              <input type="date" value={form.expiry_date} onChange={handleChange("expiry_date")} />
            </div>
          </div>

          {/* Responsabile e Conservazione */}
          <div className="docform-row">
            <div className="docform-field">
              <label>Responsabile</label>
              <input
                type="text"
                placeholder="Nome / funzione responsabile"
                value={form.responsible}
                onChange={handleChange("responsible")}
              />
            </div>
            <div className="docform-field docform-field-xs">
              <label>Conservazione (anni)</label>
              <input
                type="number"
                min="1"
                max="99"
                placeholder="10"
                value={form.retention_years}
                onChange={handleChange("retention_years")}
              />
            </div>
          </div>

          {/* Norma e paragrafo */}
          <div className="docform-row">
            <div className="docform-field">
              <label>Norma di riferimento</label>
              <select value={form.standard_id} onChange={handleChange("standard_id")}>
                <option value="">— Nessuna —</option>
                {standards.map((s) => (
                  <option key={s.standard_id} value={s.standard_id}>
                    {s.standard_code} — {s.standard_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="docform-field docform-field-sm">
              <label>Paragrafo</label>
              <input
                type="text"
                placeholder="es. 7.5, §18"
                value={form.clause_ref}
                onChange={handleChange("clause_ref")}
                disabled={!form.standard_id}
              />
            </div>
          </div>

          {/* Azienda */}
          {companies.length > 0 && (
            <div className="docform-field">
              <label>Azienda</label>
              <select value={form.company_id} onChange={handleChange("company_id")}>
                <option value="">— Documento di studio —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Note */}
          <div className="docform-field">
            <label>Note</label>
            <textarea
              rows={3}
              placeholder="Note aggiuntive..."
              value={form.notes}
              onChange={handleChange("notes")}
            />
          </div>

          {/* Errore */}
          {error && <div className="docform-error">⚠️ {error}</div>}

          {/* Footer */}
          <div className="docform-footer">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={saving}>
              Annulla
            </button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? "Salvataggio..." : isEdit ? "Salva modifiche" : "Crea documento"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default DocumentForm;
