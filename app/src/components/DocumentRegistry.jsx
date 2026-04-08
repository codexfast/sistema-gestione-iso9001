/**
 * DocumentRegistry - Registro universale documenti SGQ
 * Visualizza, crea, modifica e archivia tutti i documenti normativi
 * (ISO 9001 / 14001 / 45001 / 3834) con semaforo scadenze.
 */

import React, { useState, useEffect, useCallback } from "react";
import apiService from "../services/apiService";
import DocumentForm from "./DocumentForm";
import "./DocumentRegistry.css";

// ─── Costanti ────────────────────────────────────────────────────────────────

const DOC_TYPES = [
  { value: "", label: "Tutti i tipi" },
  { value: "procedura", label: "Procedura" },
  { value: "istruzione", label: "Istruzione operativa" },
  { value: "modulo", label: "Modulo / Registrazione" },
  { value: "manuale", label: "Manuale" },
  { value: "qualifica", label: "Qualifica personale" },
  { value: "wps", label: "WPS (Procedura saldatura)" },
  { value: "wpqr", label: "WPQR (Qualifica procedura)" },
  { value: "dichiarazione_ce", label: "Dichiarazione CE" },
  { value: "taratura", label: "Certificato taratura" },
  { value: "altro", label: "Altro" },
];

const DOC_STATUSES = [
  { value: "", label: "Tutti gli stati" },
  { value: "vigente", label: "Vigente" },
  { value: "in_revisione", label: "In revisione" },
  { value: "in_approvazione", label: "In approvazione" },
  { value: "obsoleto", label: "Obsoleto" },
];

const DOC_TYPE_LABELS = Object.fromEntries(
  DOC_TYPES.filter((t) => t.value).map((t) => [t.value, t.label])
);

// ─── Helper semaforo ─────────────────────────────────────────────────────────

function getExpiryClass(doc) {
  if (doc.status === "obsoleto") return "expiry-obsoleto";
  if (doc.is_expired) return "expiry-scaduto";
  if (doc.expiring_soon) return "expiry-warning";
  return "";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Componente principale ───────────────────────────────────────────────────

function DocumentRegistry({ onBack }) {
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [standards, setStandards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtri
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("vigente");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterExpiring, setFilterExpiring] = useState(false);

  // Paginazione
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  // Modale
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);

  // ─── Caricamento dati ─────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    try {
      const res = await apiService.getDocumentStats();
      setStats(res.data);
    } catch (err) {
      console.warn("Stats documenti:", err.message);
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: LIMIT,
        ...(filterType && { doc_type: filterType }),
        ...(filterStatus && { status: filterStatus }),
        ...(filterCompany && { company_id: filterCompany }),
        ...(filterSearch && { search: filterSearch }),
        ...(filterExpiring && { expiring_days: 30 }),
      };
      const res = await apiService.getDocuments(params);
      setDocuments(res.data || []);
      setTotal(res.pagination?.total || 0);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      setError(err.message || "Errore caricamento documenti");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterStatus, filterCompany, filterSearch, filterExpiring]);

  const loadCompanies = useCallback(async () => {
    try {
      const res = await apiService.getCompanies();
      setCompanies(res.data || []);
    } catch {
      // non bloccante
    }
  }, []);

  const loadStandards = useCallback(async () => {
    try {
      const res = await apiService.getStandards();
      setStandards(res.data || res || []);
    } catch {
      // non bloccante
    }
  }, []);

  useEffect(() => {
    loadCompanies();
    loadStandards();
    loadStats();
  }, [loadCompanies, loadStandards, loadStats]);

  useEffect(() => {
    setPage(1);
  }, [filterType, filterStatus, filterCompany, filterSearch, filterExpiring]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // ─── Azioni ───────────────────────────────────────────────────────────────

  const handleNew = () => {
    setEditingDoc(null);
    setModalOpen(true);
  };

  const handleEdit = (doc) => {
    setEditingDoc(doc);
    setModalOpen(true);
  };

  const handleArchive = async (doc) => {
    if (!window.confirm(`Archiviare "${doc.title}" come obsoleto?\nL'operazione è reversibile modificando lo stato.`)) return;
    try {
      await apiService.archiveDocument(doc.id);
      await loadDocuments();
      await loadStats();
    } catch (err) {
      alert("Errore archiviazione: " + err.message);
    }
  };

  const handleSaved = async () => {
    setModalOpen(false);
    setEditingDoc(null);
    await loadDocuments();
    await loadStats();
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="docregistry-page">
      {/* Header */}
      <div className="docregistry-header">
        <button className="btn-back" onClick={onBack}>← Indietro</button>
        <h2>📄 Registro Documenti SGQ</h2>
        <button className="btn-primary" onClick={handleNew}>+ Nuovo documento</button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="docregistry-stats">
          <div className="stat-chip stat-vigente" onClick={() => { setFilterStatus("vigente"); setFilterExpiring(false); }}>
            <span className="stat-num">{stats.vigenti}</span>
            <span className="stat-label">Vigenti</span>
          </div>
          <div className="stat-chip stat-warning" onClick={() => { setFilterStatus("vigente"); setFilterExpiring(true); }}>
            <span className="stat-num">{stats.in_scadenza_30gg}</span>
            <span className="stat-label">In scadenza</span>
          </div>
          <div className="stat-chip stat-danger" onClick={() => setFilterStatus("")}>
            <span className="stat-num">{stats.scaduti}</span>
            <span className="stat-label">Scaduti</span>
          </div>
          <div className="stat-chip stat-revisione" onClick={() => setFilterStatus("in_revisione")}>
            <span className="stat-num">{stats.in_revisione}</span>
            <span className="stat-label">In revisione</span>
          </div>
          <div className="stat-chip stat-total">
            <span className="stat-num">{stats.total}</span>
            <span className="stat-label">Totale</span>
          </div>
        </div>
      )}

      {/* Filtri */}
      <div className="docregistry-filters">
        <input
          type="text"
          className="filter-search"
          placeholder="🔍 Cerca per titolo o codice..."
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
        />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          {DOC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          {DOC_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        {companies.length > 0 && (
          <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}>
            <option value="">Tutte le aziende</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
        <label className="filter-check">
          <input
            type="checkbox"
            checked={filterExpiring}
            onChange={(e) => setFilterExpiring(e.target.checked)}
          />
          Solo in scadenza (30gg)
        </label>
        <button
          className="btn-reset"
          onClick={() => { setFilterType(""); setFilterStatus("vigente"); setFilterCompany(""); setFilterSearch(""); setFilterExpiring(false); }}
        >
          Reset
        </button>
      </div>

      {/* Errore */}
      {error && (
        <div className="docregistry-error">
          ⚠️ {error}
          <button onClick={loadDocuments}>Riprova</button>
        </div>
      )}

      {/* Tabella */}
      {loading ? (
        <div className="docregistry-loading">
          <div className="loading-spinner-sm"></div>
          <span>Caricamento...</span>
        </div>
      ) : documents.length === 0 ? (
        <div className="docregistry-empty">
          <p>Nessun documento trovato con i filtri selezionati.</p>
          <button className="btn-primary" onClick={handleNew}>+ Aggiungi il primo documento</button>
        </div>
      ) : (
        <>
          <div className="docregistry-count">
            {total} documento{total !== 1 ? "i" : ""} trovato{total !== 1 ? "i" : ""}
          </div>
          <div className="docregistry-table-wrap">
            <table className="docregistry-table">
              <thead>
                <tr>
                  <th>Codice</th>
                  <th>Titolo</th>
                  <th>Tipo</th>
                  <th>Rev.</th>
                  <th>Stato</th>
                  <th>Scadenza</th>
                  <th>Azienda</th>
                  <th>Responsabile</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className={getExpiryClass(doc)}>
                    <td className="col-code">{doc.doc_code || "—"}</td>
                    <td className="col-title">
                      <span className="doc-title">{doc.title}</span>
                      {doc.clause_ref && (
                        <span className="doc-clause">{doc.standard_code} §{doc.clause_ref}</span>
                      )}
                    </td>
                    <td className="col-type">
                      <span className="doc-type-badge">{DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}</span>
                    </td>
                    <td className="col-rev">{doc.revision || "—"}</td>
                    <td className="col-status">
                      <span className={`status-badge status-${doc.status}`}>
                        {DOC_STATUSES.find((s) => s.value === doc.status)?.label || doc.status}
                      </span>
                    </td>
                    <td className={`col-expiry ${getExpiryClass(doc)}`}>
                      {doc.expiry_date ? (
                        <span title={doc.is_expired ? "SCADUTO" : doc.expiring_soon ? "In scadenza entro 30gg" : ""}>
                          {doc.is_expired && "⚠️ "}
                          {doc.expiring_soon && !doc.is_expired && "🟡 "}
                          {formatDate(doc.expiry_date)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="col-company">{doc.company_name || "—"}</td>
                    <td className="col-responsible">{doc.responsible || "—"}</td>
                    <td className="col-actions">
                      <button
                        className="btn-icon btn-edit"
                        title="Modifica"
                        onClick={() => handleEdit(doc)}
                      >✏️</button>
                      {doc.status !== "obsoleto" && (
                        <button
                          className="btn-icon btn-archive"
                          title="Archivia come obsoleto"
                          onClick={() => handleArchive(doc)}
                        >🗄️</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginazione */}
          {totalPages > 1 && (
            <div className="docregistry-pagination">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prec.</button>
              <span>Pagina {page} di {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Succ. →</button>
            </div>
          )}
        </>
      )}

      {/* Modale */}
      {modalOpen && (
        <DocumentForm
          doc={editingDoc}
          companies={companies}
          standards={standards}
          onSave={handleSaved}
          onClose={() => { setModalOpen(false); setEditingDoc(null); }}
        />
      )}
    </div>
  );
}

export default DocumentRegistry;
