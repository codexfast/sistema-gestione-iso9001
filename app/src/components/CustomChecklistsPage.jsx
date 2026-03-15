/**
 * Custom Checklists Page - Phase 6.1 + 6.2
 * Elenco checklist personalizzate, creazione, modifica, eliminazione.
 * Editor sezioni e voci quando si apre una checklist.
 */
import React, { useState, useEffect, useCallback } from "react";
import apiService from "../services/apiService";
import "./CustomChecklistsPage.css";

const CustomChecklistsPage = ({ onBack }) => {
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [checklistDetail, setChecklistDetail] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadChecklists = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiService.getCustomChecklists();
      setChecklists(res?.data ?? []);
    } catch (err) {
      console.error("Errore caricamento checklist:", err);
      setError(err.message || "Errore caricamento");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChecklists();
  }, [loadChecklists]);

  const loadChecklistDetail = useCallback(async (id) => {
    try {
      const res = await apiService.getCustomChecklist(id);
      setChecklistDetail(res?.data ?? null);
    } catch (err) {
      console.error("Errore dettaglio checklist:", err);
      setChecklistDetail(null);
    }
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createName.trim()) return;
    try {
      setSaving(true);
      setError(null);
      await apiService.createCustomChecklist({
        name: createName.trim(),
        description: createDesc.trim() || null,
      });
      setCreateName("");
      setCreateDesc("");
      setShowCreateForm(false);
      await loadChecklists();
    } catch (err) {
      setError(err.message || "Errore creazione");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Eliminare la checklist "${name}"? Questa azione non può essere annullata.`)) return;
    try {
      await apiService.deleteCustomChecklist(id);
      if (editingId === id) {
        setEditingId(null);
        setChecklistDetail(null);
      }
      await loadChecklists();
    } catch (err) {
      setError(err.message || "Errore eliminazione");
    }
  };

  const handleOpenEditor = (id) => {
    setEditingId(id);
    loadChecklistDetail(id);
  };

  const handleCloseEditor = () => {
    setEditingId(null);
    setChecklistDetail(null);
  };

  if (editingId && checklistDetail) {
    return (
      <CustomChecklistEditor
        checklist={checklistDetail}
        onBack={handleCloseEditor}
        onSaved={() => loadChecklistDetail(editingId)}
      />
    );
  }

  return (
    <div className="custom-checklists-page">
      <div className="cc-header">
        <button type="button" className="btn-back" onClick={onBack}>
          ← Indietro
        </button>
        <h2>Checklist personalizzate</h2>
        <p className="cc-desc">
          Crea e gestisci checklist personalizzate con sezioni e voci. Puoi assegnare una checklist a un audit in fase di creazione.
        </p>
      </div>

      {error && (
        <div className="cc-error">
          {error}
          <button type="button" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {showCreateForm ? (
        <form onSubmit={handleCreate} className="cc-create-form">
          <input
            type="text"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="Nome checklist *"
            required
            autoFocus
          />
          <input
            type="text"
            value={createDesc}
            onChange={(e) => setCreateDesc(e.target.value)}
            placeholder="Descrizione (opzionale)"
          />
          <div className="cc-form-actions">
            <button type="button" onClick={() => setShowCreateForm(false)}>Annulla</button>
            <button type="submit" disabled={saving}>{saving ? "Creazione..." : "Crea"}</button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="btn-create"
          onClick={() => setShowCreateForm(true)}
        >
          ➕ Crea checklist
        </button>
      )}

      {loading ? (
        <p>Caricamento...</p>
      ) : checklists.length === 0 ? (
        <p className="cc-empty">Nessuna checklist. Crea la prima per iniziare.</p>
      ) : (
        <ul className="cc-list">
          {checklists.map((c) => (
            <li key={c.id} className="cc-item">
              <div className="cc-item-main">
                <span className="cc-item-name">{c.name}</span>
                {c.description && <span className="cc-item-desc">{c.description}</span>}
              </div>
              <div className="cc-item-actions">
                <button type="button" className="btn-edit" onClick={() => handleOpenEditor(c.id)} title="Modifica">
                  ✏️
                </button>
                <button type="button" className="btn-delete" onClick={() => handleDelete(c.id, c.name)} title="Elimina">
                  🗑️
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/**
 * Editor sezioni e voci (Phase 6.2) + Template report (Phase 7.4)
 */
function CustomChecklistEditor({ checklist, onBack, onSaved }) {
  const [sections, setSections] = useState([]);
  const [newSectionCode, setNewSectionCode] = useState("");
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newItemBySection, setNewItemBySection] = useState({}); // { sectionId: { code, title } }
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [templateSaving, setTemplateSaving] = useState(false);

  useEffect(() => {
    setSections(checklist?.sections ?? []);
  }, [checklist]);

  useEffect(() => {
    if (!checklist?.id) return;
    let cancelled = false;
    async function load() {
      try {
        const [tplRes, resolved] = await Promise.all([
          apiService.getReportTemplates("audit"),
          apiService.getReportTemplate(null, checklist.id),
        ]);
        if (cancelled) return;
        setTemplates(tplRes?.data ?? []);
        if (resolved?.id) setSelectedTemplateId(resolved.id);
      } catch (err) {
        console.warn("Template non disponibili:", err);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [checklist?.id]);

  const handleTemplateChange = async (e) => {
    const templateId = e.target.value ? parseInt(e.target.value, 10) : null;
    if (!templateId || !checklist?.id) return;
    try {
      setTemplateSaving(true);
      await apiService.assignReportTemplateToCustomChecklist(checklist.id, templateId);
      setSelectedTemplateId(templateId);
    } catch (err) {
      console.error("Errore assegnazione template:", err);
    } finally {
      setTemplateSaving(false);
    }
  };

  const addSection = async (e) => {
    e.preventDefault();
    if (!newSectionCode.trim() || !newSectionTitle.trim()) return;
    try {
      setSaving(true);
      await apiService.createCustomChecklistSection(checklist.id, {
        code: newSectionCode.trim(),
        title: newSectionTitle.trim(),
        display_order: sections.length,
      });
      setNewSectionCode("");
      setNewSectionTitle("");
      const res = await apiService.getCustomChecklist(checklist.id);
      setSections(res?.data?.sections ?? []);
      onSaved?.();
    } catch (err) {
      console.error("Errore creazione sezione:", err);
    } finally {
      setSaving(false);
    }
  };

  const deleteSection = async (sectionId) => {
    if (!window.confirm("Eliminare questa sezione e tutte le sue voci?")) return;
    try {
      await apiService.deleteCustomChecklistSection(checklist.id, sectionId);
      const res = await apiService.getCustomChecklist(checklist.id);
      setSections(res?.data?.sections ?? []);
      onSaved?.();
    } catch (err) {
      console.error("Errore eliminazione sezione:", err);
    }
  };

  const addItem = async (e, sectionId) => {
    e.preventDefault();
    const draft = newItemBySection[sectionId] || {};
    if (!sectionId || !draft.code?.trim() || !draft.title?.trim()) return;
    try {
      setSaving(true);
      await apiService.createCustomChecklistItem(checklist.id, {
        section_id: sectionId,
        code: draft.code.trim(),
        title: draft.title.trim(),
        response_type: "verbale",
        display_order: 0,
      });
      setNewItemBySection((prev) => {
        const next = { ...prev };
        delete next[sectionId];
        return next;
      });
      const res = await apiService.getCustomChecklist(checklist.id);
      setSections(res?.data?.sections ?? []);
      onSaved?.();
    } catch (err) {
      console.error("Errore creazione voce:", err);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (itemId) => {
    if (!window.confirm("Eliminare questa voce?")) return;
    try {
      await apiService.deleteCustomChecklistItem(checklist.id, itemId);
      const res = await apiService.getCustomChecklist(checklist.id);
      setSections(res?.data?.sections ?? []);
      onSaved?.();
    } catch (err) {
      console.error("Errore eliminazione voce:", err);
    }
  };

  return (
    <div className="custom-checklists-page cc-editor">
      <div className="cc-header">
        <button type="button" className="btn-back" onClick={onBack}>
          ← Indietro
        </button>
        <h2>{checklist?.name ?? "Editor"}</h2>
        {checklist?.description && <p className="cc-desc">{checklist.description}</p>}
      </div>

      <div className="cc-template-section">
        <h3>Template report</h3>
        <p className="cc-hint">Scegli il template Word usato per generare il report degli audit con questa checklist.</p>
        <select
          value={selectedTemplateId ?? ""}
          onChange={handleTemplateChange}
          disabled={templateSaving || !templates.length}
          className="cc-template-select"
        >
          <option value="">— Seleziona template —</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} {t.is_system ? "(sistema)" : ""}
            </option>
          ))}
        </select>
        {templateSaving && <span className="cc-saving">Salvataggio...</span>}
      </div>

      <div className="cc-editor-sections">
        <h3>Sezioni e voci</h3>

        <form onSubmit={addSection} className="cc-add-section">
          <input
            type="text"
            value={newSectionCode}
            onChange={(e) => setNewSectionCode(e.target.value)}
            placeholder="Codice (es. 1.0)"
            style={{ width: "80px" }}
          />
          <input
            type="text"
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            placeholder="Titolo sezione"
            style={{ flex: 1 }}
          />
          <button type="submit" disabled={saving}>Aggiungi sezione</button>
        </form>

        {sections.map((sec) => (
          <div key={sec.id} className="cc-section-block">
            <div className="cc-section-header">
              <strong>{sec.code}</strong> — {sec.title}
              <button type="button" className="btn-delete-small" onClick={() => deleteSection(sec.id)} title="Elimina sezione">
                🗑️
              </button>
            </div>
            <ul className="cc-items-list">
              {(sec.items || []).map((it) => (
                <li key={it.id} className="cc-item-row">
                  <span className="cc-item-code">{it.code}</span>
                  <span className="cc-item-title">{it.title}</span>
                  <button type="button" className="btn-delete-small" onClick={() => deleteItem(it.id)}>🗑️</button>
                </li>
              ))}
            </ul>
            <form onSubmit={(e) => addItem(e, sec.id)} className="cc-add-item">
              <input
                type="text"
                value={newItemBySection[sec.id]?.code ?? ""}
                onChange={(e) =>
                  setNewItemBySection((prev) => ({
                    ...prev,
                    [sec.id]: { ...(prev[sec.id] || {}), code: e.target.value },
                  }))
                }
                placeholder="Codice (es. 1.1)"
                style={{ width: "70px" }}
              />
              <input
                type="text"
                value={newItemBySection[sec.id]?.title ?? ""}
                onChange={(e) =>
                  setNewItemBySection((prev) => ({
                    ...prev,
                    [sec.id]: { ...(prev[sec.id] || {}), title: e.target.value },
                  }))
                }
                placeholder="Titolo voce"
                style={{ flex: 1 }}
              />
              <button type="submit" disabled={saving}>Aggiungi</button>
            </form>
          </div>
        ))}

        {sections.length === 0 && (
          <p className="cc-hint">Aggiungi una sezione per iniziare.</p>
        )}
      </div>
    </div>
  );
}

export default CustomChecklistsPage;
