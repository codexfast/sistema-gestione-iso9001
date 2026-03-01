/**
 * AttachmentPreview.jsx
 *
 * Preview inline degli allegati già sincronizzati sul server
 * per una specifica domanda della checklist audit.
 *
 * Props:
 * - auditId:   UUID dell'audit (metadata.id)
 * - questionId: ID numerico della domanda (87-121)
 * - refreshKey: Incrementato dal parent per forzare re-fetch post-upload
 */

import React, { useEffect, useState, useCallback } from "react";
import apiService from "../services/apiService";
import "./AttachmentPreview.css";

// MIME type → categoria display
const isImage = (mimeType) =>
  mimeType && mimeType.startsWith("image/");

const isPdf = (mimeType) =>
  mimeType === "application/pdf";

function AttachmentPreview({ auditId, questionId, refreshKey = 0 }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lightbox, setLightbox] = useState(null); // attachment_id aperto a schermo intero
  const [replacing, setReplacing] = useState(null); // attachment_id in sostituzione
  const [replacedAt, setReplacedAt] = useState({}); // { [id]: timestamp } per cache-bust immagini

  const fetchAttachments = useCallback(async () => {
    if (!auditId || !questionId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await apiService.getAttachments(auditId, null, questionId);
      const data = result?.data ?? result ?? [];
      setAttachments(Array.isArray(data) ? data : []);
    } catch (err) {
      // Fallback silenzioso: non blocca la checklist
      console.warn("[AttachmentPreview] Errore fetch allegati:", err.message);
      setError(err.message);
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  }, [auditId, questionId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments, refreshKey]);

  const handleDelete = async (attachmentId, fileName) => {
    if (!window.confirm(`Eliminare "${fileName}" dal server?\n\nQuesta operazione non può essere annullata.`)) return;

    try {
      await apiService.deleteAttachment(attachmentId);
      setAttachments((prev) => prev.filter((a) => a.attachment_id !== attachmentId));
    } catch (err) {
      alert(`❌ Errore eliminazione: ${err.message}`);
    }
  };

  /**
   * Sostituisce un allegato con un nuovo file (desktop-only via CSS).
   * Apre file picker, carica il nuovo file sul server, aggiorna la lista.
   */
  const handleReplace = useCallback((att) => {
    const input = document.createElement('input');
    input.type = 'file';
    // Suggerisci stesso tipo del file originale
    input.accept = att.mime_type?.startsWith('image/') ? 'image/*' : '*/*';
    input.style.display = 'none';

    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      document.body.removeChild(input);
      if (!file) return;

      setReplacing(att.attachment_id);
      setLightbox(null); // chiudi lightbox se aperto
      try {
        await apiService.replaceAttachment(att.attachment_id, file);
        setReplacedAt(prev => ({ ...prev, [att.attachment_id]: Date.now() }));
        await fetchAttachments(); // ri-fetch lista aggiornata
      } catch (err) {
        alert(`❌ Errore sostituzione: ${err.message}`);
      } finally {
        setReplacing(null);
      }
    };

    input.oncancel = () => { document.body.removeChild(input); };
    document.body.appendChild(input);
    input.click();
  }, [fetchAttachments]);

  // Niente da mostrare: loading silenzioso, nessun errore critico
  if (!auditId || !questionId) return null;
  if (loading && attachments.length === 0) {
    return (
      <div className="attachment-preview-loading">
        <span className="preview-loading-spinner" />
        <span>Caricamento allegati server...</span>
      </div>
    );
  }
  if (attachments.length === 0) return null;

  return (
    <div className="attachment-preview-section">
      <div className="preview-section-header">
        <span className="preview-section-icon">🖼️</span>
        <span className="preview-section-title">
          Allegati sul server ({attachments.length})
        </span>
      </div>

      <div className="preview-grid">
        {attachments.map((att) => (
          <div key={att.attachment_id} className="preview-item">
            {isImage(att.mime_type) ? (
              <div
                className="preview-image-wrapper"
                onClick={() => setLightbox(att)}
                title={att.file_name}
              >
                <img
                  src={`${apiService.getAttachmentViewUrl(att.attachment_id)}${replacedAt[att.attachment_id] ? '&v=' + replacedAt[att.attachment_id] : ''}`}
                  alt={att.file_name}
                  loading="lazy"
                  className="preview-image"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
                <div className="preview-image-fallback" style={{ display: "none" }}>
                  🖼️
                </div>
                <div className="preview-image-overlay">
                  <span>🔍</span>
                </div>
              </div>
            ) : isPdf(att.mime_type) ? (
              <a
                href={apiService.getAttachmentViewUrl(att.attachment_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="preview-file-link pdf"
                title={att.file_name}
              >
                <span className="preview-file-icon">📄</span>
                <span className="preview-file-name">{att.file_name}</span>
              </a>
            ) : (
              <a
                href={apiService.getAttachmentDownloadUrl(att.attachment_id)}
                download={att.file_name}
                className="preview-file-link other"
                title={att.file_name}
              >
                <span className="preview-file-icon">📎</span>
                <span className="preview-file-name">{att.file_name}</span>
              </a>
            )}

            <button
              type="button"
              className="preview-replace-btn"
              onClick={() => handleReplace(att)}
              disabled={replacing === att.attachment_id}
              title="Sostituisci file"
            >
              {replacing === att.attachment_id ? '⏳' : '✏️'}
            </button>
            <button
              type="button"
              className="preview-delete-btn"
              onClick={() => handleDelete(att.attachment_id, att.file_name)}
              title="Elimina allegato"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Lightbox immagine a schermo intero */}
      {lightbox && (
        <div
          className="preview-lightbox"
          onClick={() => setLightbox(null)}
        >
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="lightbox-close"
              onClick={() => setLightbox(null)}
            >
              ✕
            </button>
            <img
              src={apiService.getAttachmentViewUrl(lightbox.attachment_id)}
              alt={lightbox.file_name}
              className="lightbox-image"
            />
            <div className="lightbox-caption">
              {lightbox.file_name}
              {lightbox.description && ` — ${lightbox.description}`}
            </div>
            <div className="lightbox-actions">
              <a
                href={apiService.getAttachmentDownloadUrl(lightbox.attachment_id)}
                download={lightbox.file_name}
                className="lightbox-download"
                onClick={(e) => e.stopPropagation()}
              >
                ⬇ Scarica
              </a>
              <button
                type="button"
                className="lightbox-replace-btn"
                onClick={() => handleReplace(lightbox)}
                disabled={replacing === lightbox.attachment_id}
              >
                {replacing === lightbox.attachment_id ? '⏳ Sostituzione...' : '✏️ Sostituisci'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttachmentPreview;
