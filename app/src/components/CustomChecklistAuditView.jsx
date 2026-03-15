/**
 * Custom Checklist Audit View - Phase 6.4 + Approccio misto
 * Mostra sezioni/voci con blocchi evidenza (testo + allegato).
 * Permette di aggiungere sezioni e voci durante l'audit.
 */
import React, { useState, useEffect, useCallback } from "react";
import apiService from "../services/apiService";
import "./CustomChecklistAuditView.css";

function CustomChecklistAuditView({ audit, onUpdate }) {
  const customChecklistId = audit?.metadata?.customChecklistId ?? audit?.custom_checklist_id;
  const auditId = audit?.metadata?.auditId ?? audit?.audit_id;

  const [checklist, setChecklist] = useState(null);
  const [responses, setResponses] = useState({}); // custom_item_id -> evidence_blocks
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingSection, setAddingSection] = useState(false);
  const [addingItemBySection, setAddingItemBySection] = useState({}); // sectionId -> true
  const [newSectionCode, setNewSectionCode] = useState("");
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newItemBySection, setNewItemBySection] = useState({}); // sectionId -> { code, title }

  const loadChecklist = useCallback(async () => {
    if (!customChecklistId) return;
    try {
      const clRes = await apiService.getCustomChecklist(customChecklistId);
      setChecklist(clRes?.data ?? null);
      if (auditId) {
        const respRes = await apiService.getCustomChecklistResponses(auditId);
        const byItem = {};
        (respRes?.data ?? []).forEach((r) => {
          try {
            byItem[r.custom_item_id] = typeof r.evidence_blocks === "string"
              ? JSON.parse(r.evidence_blocks || "[]")
              : (r.evidence_blocks || []);
          } catch {
            byItem[r.custom_item_id] = [];
          }
        });
        setResponses(byItem);
      } else {
        setResponses({});
      }
    } catch (err) {
      console.error("Errore caricamento checklist custom:", err);
    }
  }, [customChecklistId, auditId]);

  useEffect(() => {
    if (!customChecklistId) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        await loadChecklist();
      } catch (e) {
        /* handled above */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [customChecklistId, auditId, loadChecklist]);

  const saveResponses = useCallback(
    async (itemId, blocks) => {
      if (!auditId) return;
      try {
        setSaving(true);
        await apiService.saveCustomChecklistResponses(auditId, [
          { custom_item_id: itemId, evidence_blocks: blocks },
        ]);
        setResponses((prev) => ({ ...prev, [itemId]: blocks }));
      } catch (err) {
        console.error("Errore salvataggio risposte:", err);
      } finally {
        setSaving(false);
      }
    },
    [auditId]
  );

  const updateBlock = (itemId, blockIndex, field, value) => {
    const blocks = [...(responses[itemId] || [])];
    if (!blocks[blockIndex]) blocks[blockIndex] = { text: "", attachment_id: null };
    blocks[blockIndex][field] = value;
    setResponses((prev) => ({ ...prev, [itemId]: blocks }));
  };

  const addBlock = (itemId) => {
    const blocks = [...(responses[itemId] || []), { text: "", attachment_id: null }];
    setResponses((prev) => ({ ...prev, [itemId]: blocks }));
    saveResponses(itemId, blocks);
  };

  const removeBlock = (itemId, blockIndex) => {
    const blocks = (responses[itemId] || []).filter((_, i) => i !== blockIndex);
    setResponses((prev) => ({ ...prev, [itemId]: blocks }));
    saveResponses(itemId, blocks);
  };

  const handleFileSelect = async (itemId, blockIndex, file) => {
    if (!file || !auditId) return;
    try {
      const res = await apiService.uploadAttachment(file, {
        auditId,
        customItemId: itemId,
        category: "evidence",
      });
      const attId = res?.data?.attachment_id ?? res?.attachment_id;
      if (attId) {
        const blocks = [...(responses[itemId] || [])];
        if (!blocks[blockIndex]) blocks[blockIndex] = { text: "", attachment_id: null };
        blocks[blockIndex].attachment_id = attId;
        setResponses((prev) => ({ ...prev, [itemId]: blocks }));
        await saveResponses(itemId, blocks);
      }
    } catch (err) {
      console.error("Errore upload allegato:", err);
    }
  };

  const handleAddSection = async (e) => {
    e.preventDefault();
    if (!newSectionCode.trim() || !newSectionTitle.trim()) return;
    try {
      setSaving(true);
      await apiService.createCustomChecklistSection(customChecklistId, {
        code: newSectionCode.trim(),
        title: newSectionTitle.trim(),
        display_order: checklist?.sections?.length ?? 0,
      });
      setNewSectionCode("");
      setNewSectionTitle("");
      setAddingSection(false);
      await loadChecklist();
      onUpdate?.();
    } catch (err) {
      console.error("Errore creazione sezione:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async (e, sectionId) => {
    e.preventDefault();
    const draft = newItemBySection[sectionId] || {};
    if (!draft.code?.trim() || !draft.title?.trim()) return;
    try {
      setSaving(true);
      await apiService.createCustomChecklistItem(customChecklistId, {
        section_id: sectionId,
        code: draft.code.trim(),
        title: draft.title.trim(),
        response_type: "verbale",
        display_order: 0,
      });
      setNewItemBySection((prev) => { const n = { ...prev }; delete n[sectionId]; return n; });
      setAddingItemBySection((prev) => ({ ...prev, [sectionId]: false }));
      await loadChecklist();
      onUpdate?.();
    } catch (err) {
      console.error("Errore creazione voce:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!customChecklistId) return null;
  if (loading) return <div className="custom-checklist-loading">Caricamento checklist...</div>;

  const hasNoSections = !(checklist?.sections?.length > 0);

  return (
    <div className="custom-checklist-audit-view">
      {!auditId && (
        <div className="custom-checklist-no-audit-id-hint">
          L&apos;audit non è ancora sincronizzato con il server. La struttura della checklist è visibile; il salvataggio delle evidenze sarà disponibile dopo la sincronizzazione.
        </div>
      )}
      {saving && <span className="custom-checklist-saving">Salvataggio...</span>}

      {/* Stato vuoto: messaggio chiaro + pulsante */}
      {hasNoSections && !addingSection && (
        <div className="custom-checklist-empty-state">
          <p>La checklist non ha ancora sezioni.</p>
          <p className="hint">Aggiungi la prima sezione (es. &quot;1.0 — Introduzione&quot;) e poi i sotto-punti con le evidenze durante l&apos;audit.</p>
        </div>
      )}

      {/* Form aggiungi sezione */}
      {addingSection ? (
        <form onSubmit={handleAddSection} className="custom-checklist-add-section-form">
          <input
            type="text"
            value={newSectionCode}
            onChange={(e) => setNewSectionCode(e.target.value)}
            placeholder="Codice (es. 1.0)"
            required
            style={{ width: "80px" }}
          />
          <input
            type="text"
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            placeholder="Titolo sezione"
            required
            style={{ flex: 1 }}
          />
          <button type="submit" disabled={saving}>Aggiungi</button>
          <button type="button" onClick={() => { setAddingSection(false); setNewSectionCode(""); setNewSectionTitle(""); }}>
            Annulla
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="btn-add-section"
          onClick={() => setAddingSection(true)}
        >
          ➕ Aggiungi sezione
        </button>
      )}

      {/* Sezioni esistenti */}
      {(checklist?.sections || []).map((sec) => (
        <div key={sec.id} className="custom-checklist-section">
          <h4 className="custom-checklist-section-title">
            {sec.code} — {sec.title}
          </h4>
          {(sec.items || []).map((item) => (
            <div key={item.id} className="custom-checklist-item">
              <div className="custom-checklist-item-title">
                {item.code} — {item.title}
              </div>
              <div className="custom-checklist-evidence-blocks">
                {(responses[item.id] || []).map((block, idx) => (
                  <div key={idx} className="evidence-block">
                    <textarea
                      value={block.text || ""}
                      onChange={(e) => updateBlock(item.id, idx, "text", e.target.value)}
                      onBlur={() => saveResponses(item.id, responses[item.id] || [])}
                      placeholder="Testo evidenza (usa ** per grassetto)"
                      rows={3}
                    />
                    <div className="evidence-block-actions">
                      <label className="btn-attach">
                        📎 Allega foto/documento
                        <input
                          type="file"
                          accept="image/*,.pdf,.doc,.docx"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileSelect(item.id, idx, f);
                            e.target.value = "";
                          }}
                          style={{ display: "none" }}
                        />
                      </label>
                      {block.attachment_id && (
                        <a
                          href={apiService.getAttachmentViewUrl(block.attachment_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link-preview"
                        >
                          Vedi allegato
                        </a>
                      )}
                      <button
                        type="button"
                        className="btn-remove"
                        onClick={() => removeBlock(item.id, idx)}
                      >
                        Rimuovi evidenza
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-add-evidence"
                  onClick={() => addBlock(item.id)}
                >
                  ➕ Aggiungi evidenza
                </button>
              </div>
            </div>
          ))}

          {/* Form aggiungi voce (sotto-punto) nella sezione */}
          {addingItemBySection[sec.id] ? (
            <form onSubmit={(e) => handleAddItem(e, sec.id)} className="custom-checklist-add-item-form">
              <input
                type="text"
                value={newItemBySection[sec.id]?.code ?? ""}
                onChange={(e) => setNewItemBySection((prev) => ({
                  ...prev,
                  [sec.id]: { ...(prev[sec.id] || {}), code: e.target.value },
                }))}
                placeholder="Codice (es. 1.1)"
                required
                style={{ width: "70px" }}
              />
              <input
                type="text"
                value={newItemBySection[sec.id]?.title ?? ""}
                onChange={(e) => setNewItemBySection((prev) => ({
                  ...prev,
                  [sec.id]: { ...(prev[sec.id] || {}), title: e.target.value },
                }))}
                placeholder="Titolo sotto-punto"
                required
                style={{ flex: 1 }}
              />
              <button type="submit" disabled={saving}>Aggiungi</button>
              <button type="button" onClick={() => { setAddingItemBySection((p) => ({ ...p, [sec.id]: false })); setNewItemBySection((p) => { const n = { ...p }; delete n[sec.id]; return n; }); }}>
                Annulla
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="btn-add-item"
              onClick={() => setAddingItemBySection((prev) => ({ ...prev, [sec.id]: true }))}
            >
              ➕ Aggiungi sotto-punto
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default CustomChecklistAuditView;
