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
                  src={apiService.getAttachmentViewUrl(att.attachment_id)}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttachmentPreview;
