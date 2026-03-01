/**
 * AttachmentPreview.jsx
 *
 * Preview inline degli allegati giÃ  sincronizzati sul server
 * per una specifica domanda della checklist audit.
 *
 * Props:
 * - auditId:   UUID dell'audit (metadata.id)
 * - questionId: ID numerico della domanda (87-121)
 * - refreshKey: Incrementato dal parent per forzare re-fetch post-upload
 *
 * Pattern: fetch blob con Authorization header per evitare problemi token in URL
 * (il browser non passa auth header su <img src> / <a href> cross-origin).
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import apiService from "../services/apiService";
import "./AttachmentPreview.css";

// MIME type â†’ categoria display
const isImage = (mimeType) =>
  mimeType && mimeType.startsWith("image/");

const isPdf = (mimeType) =>
  mimeType === "application/pdf";

function AttachmentPreview({ auditId, questionId, refreshKey = 0 }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lightbox, setLightbox] = useState(null); // attachment aperto a schermo intero
  const [replacing, setReplacing] = useState(null); // attachment_id in sostituzione
  const [downloading, setDownloading] = useState(null); // attachment_id in download

  // Blob URL per immagini e PDF (caricati via fetch con auth header)
  const [blobUrls, setBlobUrls] = useState({}); // { [attachment_id]: blobUrl }
  const [blobLoading, setBlobLoading] = useState({}); // { [attachment_id]: boolean }
  const [blobError, setBlobError] = useState({});   // { [attachment_id]: string }

  // Ref per cleanup blob URL a smontaggio
  const blobUrlsRef = useRef({});

  // Cleanup blob URL quando il componente viene smontato
  useEffect(() => {
    return () => {
      Object.values(blobUrlsRef.current).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, []);

  /**
   * Carica il blob di un allegato (immagine o PDF) tramite fetch autenticato
   * e salva l'object URL nello state.
   */
  const loadBlob = useCallback(async (att) => {
    const id = att.attachment_id;
    if (!isImage(att.mime_type) && !isPdf(att.mime_type)) return;

    setBlobLoading((prev) => ({ ...prev, [id]: true }));
    setBlobError((prev) => ({ ...prev, [id]: null }));
    try {
      const { blob } = await apiService.fetchAttachmentBlob(id, 'view');
      const url = URL.createObjectURL(blob);
      // Revoca URL precedente se esistente
      if (blobUrlsRef.current[id]) URL.revokeObjectURL(blobUrlsRef.current[id]);
      blobUrlsRef.current[id] = url;
      setBlobUrls((prev) => ({ ...prev, [id]: url }));
    } catch (err) {
      console.warn(`[AttachmentPreview] Blob load error (${id}):`, err.message);
      setBlobError((prev) => ({ ...prev, [id]: err.message }));
    } finally {
      setBlobLoading((prev) => ({ ...prev, [id]: false }));
    }
  }, []);

  const fetchAttachments = useCallback(async () => {
    if (!auditId || !questionId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await apiService.getAttachments(auditId, null, questionId);
      const data = result?.data ?? result ?? [];
      const list = Array.isArray(data) ? data : [];
      setAttachments(list);
      // Avvia caricamento blob per immagini e PDF
      list.forEach((att) => loadBlob(att));
    } catch (err) {
      console.warn("[AttachmentPreview] Errore fetch allegati:", err.message);
      setError(err.message);
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  }, [auditId, questionId, loadBlob]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments, refreshKey]);

  const handleDelete = async (attachmentId, fileName) => {
    if (!window.confirm(`Eliminare "${fileName}" dal server?\n\nQuesta operazione non puÃ² essere annullata.`)) return;

    try {
      await apiService.deleteAttachment(attachmentId);
      // Revoca blob URL
      if (blobUrlsRef.current[attachmentId]) {
        URL.revokeObjectURL(blobUrlsRef.current[attachmentId]);
        delete blobUrlsRef.current[attachmentId];
      }
      setBlobUrls((prev) => { const n = { ...prev }; delete n[attachmentId]; return n; });
      setAttachments((prev) => prev.filter((a) => a.attachment_id !== attachmentId));
    } catch (err) {
      alert(`âŒ Errore eliminazione: ${err.message}`);
    }
  };

  /**
   * Download di file non-immagine/PDF via fetch (Authorization header).
   */
  const handleDownload = async (att) => {
    setDownloading(att.attachment_id);
    try {
      await apiService.downloadAttachmentBlob(att.attachment_id, att.file_name);
    } catch (err) {
      alert(`âŒ Download fallito: ${err.message}`);
    } finally {
      setDownloading(null);
    }
  };

  /**
   * Sostituisce un allegato con un nuovo file (desktop-only via CSS).
   * Apre file picker, carica il nuovo file sul server, ri-carica il blob.
   */
  const handleReplace = useCallback((att) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = att.mime_type?.startsWith('image/') ? 'image/*' : '*/*';
    input.style.display = 'none';

    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      document.body.removeChild(input);
      if (!file) return;

      setReplacing(att.attachment_id);
      setLightbox(null);
      try {
        await apiService.replaceAttachment(att.attachment_id, file);
        // Ri-carica il blob aggiornato
        await loadBlob({ ...att, mime_type: file.type || att.mime_type });
        await fetchAttachments();
      } catch (err) {
        alert(`âŒ Errore sostituzione: ${err.message}`);
      } finally {
        setReplacing(null);
      }
    };

    input.oncancel = () => { document.body.removeChild(input); };
    document.body.appendChild(input);
    input.click();
  }, [fetchAttachments, loadBlob]);

  // Niente da mostrare
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
        <span className="preview-section-icon">ðŸ–¼ï¸</span>
        <span className="preview-section-title">
          Allegati sul server ({attachments.length})
        </span>
      </div>

      <div className="preview-grid">
        {attachments.map((att) => {
          const id = att.attachment_id;
          const blobUrl = blobUrls[id];
          const isBlobLoading = blobLoading[id];
          const isBlobError = blobError[id];

          return (
            <div key={id} className="preview-item">
              {isImage(att.mime_type) ? (
                <div
                  className="preview-image-wrapper"
                  onClick={() => blobUrl && setLightbox(att)}
                  title={blobUrl ? att.file_name : (isBlobLoading ? 'Caricamento...' : 'Errore caricamento')}
                  style={{ cursor: blobUrl ? 'pointer' : 'default' }}
                >
                  {isBlobLoading && (
                    <div className="preview-image-fallback">
                      <span className="preview-loading-spinner" style={{ width: 20, height: 20 }} />
                    </div>
                  )}
                  {!isBlobLoading && blobUrl && (
                    <>
                      <img
                        src={blobUrl}
                        alt={att.file_name}
                        className="preview-image"
                      />
                      <div className="preview-image-overlay">
                        <span>ðŸ”</span>
                      </div>
                    </>
                  )}
                  {!isBlobLoading && !blobUrl && (
                    <div className="preview-image-fallback">
                      {isBlobError ? 'âš ï¸' : 'ðŸ–¼ï¸'}
                    </div>
                  )}
                </div>
              ) : isPdf(att.mime_type) ? (
                <button
                  type="button"
                  className="preview-file-link pdf"
                  title={att.file_name}
                  disabled={isBlobLoading || !!isBlobError}
                  onClick={() => {
                    if (blobUrl) {
                      window.open(blobUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                >
                  <span className="preview-file-icon">
                    {isBlobLoading ? 'â³' : isBlobError ? 'âš ï¸' : 'ðŸ“„'}
                  </span>
                  <span className="preview-file-name">{att.file_name}</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="preview-file-link other"
                  title={att.file_name}
                  disabled={downloading === id}
                  onClick={() => handleDownload(att)}
                >
                  <span className="preview-file-icon">
                    {downloading === id ? 'â³' : 'ðŸ“Ž'}
                  </span>
                  <span className="preview-file-name">{att.file_name}</span>
                </button>
              )}

              <button
                type="button"
                className="preview-replace-btn"
                onClick={() => handleReplace(att)}
                disabled={replacing === id}
                title="Sostituisci file"
              >
                {replacing === id ? 'â³' : 'âœï¸'}
              </button>
              <button
                type="button"
                className="preview-delete-btn"
                onClick={() => handleDelete(id, att.file_name)}
                title="Elimina allegato"
              >
                âœ•
              </button>
            </div>
          );
        })}
      </div>

      {/* Lightbox immagine a schermo intero */}
      {lightbox && blobUrls[lightbox.attachment_id] && (
        <div
          className="preview-lightbox"
          onClick={() => setLightbox(null)}
        >
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="lightbox-close"
              onClick={() => setLightbox(null)}
            >
              âœ•
            </button>
            <img
              src={blobUrls[lightbox.attachment_id]}
              alt={lightbox.file_name}
              className="lightbox-image"
            />
            <div className="lightbox-caption">
              {lightbox.file_name}
              {lightbox.description && ` â€” ${lightbox.description}`}
            </div>
            <div className="lightbox-actions">
              <button
                type="button"
                className="lightbox-download"
                disabled={downloading === lightbox.attachment_id}
                onClick={(e) => { e.stopPropagation(); handleDownload(lightbox); }}
              >
                {downloading === lightbox.attachment_id ? 'â³ Download...' : 'â¬‡ Scarica'}
              </button>
              <button
                type="button"
                className="lightbox-replace-btn"
                onClick={() => handleReplace(lightbox)}
                disabled={replacing === lightbox.attachment_id}
              >
                {replacing === lightbox.attachment_id ? 'â³ Sostituzione...' : 'âœï¸ Sostituisci'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttachmentPreview;

