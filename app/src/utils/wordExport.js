/**
 * wordExport.js - Genera il report Word di audit ISO 9001 usando docx v8.
 * Nessun template esterno, nessuna OOXML injection — tutto in codice.
 *
 * API pubblica:
 *   exportAuditToWord(audit, getViewUrl?)   → scarica il file
 *   exportAuditToFileSystem(audit)          → File System Access API con fallback
 *   exportAuditToWorkspace(audit, provider) → workspace provider con fallback
 */

import { Document, Packer, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import {
    calculateMetrics,
    buildHeaderTable,
    buildGeneralDataSection,
    buildObjectiveSection,
    buildPendingIssuesSection,
    buildChecklistSection,
    buildRileviSummarySection,
    buildOutcomeSection,
} from './wordExportHelpers.js';

// --- Costruisce il documento docx completo ---
function buildDocument(audit, getViewUrl = null) {
    const checklist    = audit.checklist     || {};
    const attachments  = audit.attachments   || [];
    const pending      = audit.pendingIssues || [];
    const metrics      = calculateMetrics(checklist);

    const children = [
        ...buildHeaderTable(audit),
        ...buildGeneralDataSection(audit),
        ...buildObjectiveSection(audit),
        ...buildPendingIssuesSection(pending),
        ...buildChecklistSection(checklist, attachments, getViewUrl),
        ...buildRileviSummarySection(checklist),
        ...buildOutcomeSection(audit, metrics),
    ];

    return new Document({
        styles: {
            paragraphStyles: [
                {
                    id: 'Heading1',
                    name: 'heading 1',
                    basedOn: 'Normal',
                    next: 'Normal',
                    run:       { bold: true, size: 28, color: '2C3E50' },
                    paragraph: { spacing: { before: 360, after: 200 } },
                },
                {
                    id: 'Heading2',
                    name: 'heading 2',
                    basedOn: 'Normal',
                    next: 'Normal',
                    run:       { bold: true, size: 24, color: '2C3E50' },
                    paragraph: { spacing: { before: 300, after: 160 } },
                },
            ],
        },
        sections: [{
            properties: {
                page: {
                    margin: { top: 720, right: 720, bottom: 720, left: 720 },
                },
            },
            children,
        }],
    });
}

function buildFileName(audit) {
    const client = (audit.metadata?.clientName  || 'Cliente').replace(/[^a-z0-9]/gi, '_');
    const number = (audit.metadata?.auditNumber || 'N-A').replace(/[^a-z0-9]/gi, '_');
    return `Audit_${number}_${client}.docx`;
}

// --- API pubblica ---

/**
 * Genera e scarica il report Word.
 * @param {Object}        audit
 * @param {Function|null} getViewUrl   callback (attachmentId) → url stringa
 * @returns {Promise<string>}          nome del file scaricato
 */
export async function exportAuditToWord(audit, getViewUrl = null) {
    if (!audit?.metadata) throw new Error('Audit non valido: metadata mancante');
    const doc      = buildDocument(audit, getViewUrl);
    const blob     = await Packer.toBlob(doc);
    const fileName = buildFileName(audit);
    saveAs(blob, fileName);
    return fileName;
}

/**
 * Salva il report Word in una cartella selezionata dall utente (File System Access API).
 * Fallback download su mobile.
 */
export async function exportAuditToFileSystem(audit) {
    if (!audit?.metadata) throw new Error('Audit non valido: metadata mancante');

    if (!window.showDirectoryPicker) {
        const fileName = await exportAuditToWord(audit);
        return { success: true, path: 'Download/' + fileName, fileName, fallback: true };
    }

    try {
        const dirHandle    = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'documents' });
        const auditFolder  = await dirHandle.getDirectoryHandle('Audit', { create: true });
        const year        = audit.metadata.projectYear || new Date().getFullYear();
        const clientName  = (audit.metadata.clientName || 'Cliente').replace(/[^a-z0-9]/gi, '_');
        const clientFolder = await auditFolder.getDirectoryHandle(`${year}-${clientName}`, { create: true });

        const doc      = buildDocument(audit, null);
        const blob     = await Packer.toBlob(doc);
        const fileName = buildFileName(audit);

        const fileHandle = await clientFolder.getFileHandle(fileName, { create: true });
        const writable   = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        return { success: true, path: `Audit/${year}-${clientName}/${fileName}`, fileName };
    } catch (error) {
        if (error.name === 'AbortError') throw new Error("Salvataggio annullato dall utente");
        throw error;
    }
}

/**
 * Salva il report tramite LocalFsProvider (struttura ISO 9001).
 */
export async function exportAuditToWorkspace(audit, fsProvider) {
    if (!audit?.metadata) throw new Error('Audit non valido: metadata mancante');

    if (!window.showDirectoryPicker || !fsProvider?.ready()) {
        const fileName = await exportAuditToWord(audit);
        return { success: true, path: 'Download/' + fileName, fileName, fallback: true };
    }

    try {
        const doc       = buildDocument(audit, null);
        const blob      = await Packer.toBlob(doc);
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const clientName = (audit.metadata.clientName  || 'Cliente').replace(/[^a-z0-9]/gi, '_');
        const number     = (audit.metadata.auditNumber || 'N-A').replace(/[^a-z0-9]/gi, '_');
        const fileName   = `Audit_${number}_${clientName}_${timestamp}.docx`;

        const result = await fsProvider.saveReport(blob, fileName);
        return { success: true, path: result.path, fileName: result.fileName };
    } catch (error) {
        throw new Error(`Errore salvataggio report: ${error.message}`);
    }
}