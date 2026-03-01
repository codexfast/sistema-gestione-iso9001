/**
 * wordExport.js - Genera il report Word di audit ISO 9001 usando docx v8.
 * Nessun template esterno, nessuna OOXML injection — tutto in codice.
 *
 * API pubblica:
 *   exportAuditToWord(audit, getViewUrl?)   → scarica il file
 *   exportAuditToFileSystem(audit)          → File System Access API con fallback
 *   exportAuditToWorkspace(audit, provider) → workspace provider con fallback
 */

import {
    Document, Packer, Header, Footer,
    Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, WidthType, BorderStyle,
    PageNumber, NumberFormat,
} from 'docx';
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

// ─── Intestazione pagina ────────────────────────────────────────────────────
/**
 * Intestazione 3 colonne:
 *   SX: Nome cliente + N° Audit
 *   CX: Titolo documento
 *   DX: Data audit
 *
 * Per personalizzare: cambia testo, colori o struttura qui sotto.
 */
function buildPageHeader(audit) {
    const meta = audit?.metadata || {};
    const client = meta.clientName || 'Cliente';
    const number = meta.auditNumber || 'N/D';
    const date = meta.auditDate
        ? new Date(meta.auditDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : 'N/D';

    const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

    const cell = (children, pct, align) => new TableCell({
        children: Array.isArray(children) ? children : [children],
        width: { size: pct, type: WidthType.PERCENTAGE },
        borders: BORDERS,
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
    });

    const para = (text, opts = {}) => new Paragraph({
        children: Array.isArray(text) ? text : [new TextRun({
            text: String(text ?? ''),
            bold: opts.bold ?? false,
            size: opts.size ?? 18,
            color: opts.color ?? '2C3E50',
            italics: opts.italic ?? false,
        })],
        alignment: opts.align ?? AlignmentType.LEFT,
        spacing: { before: 0, after: 0 },
    });

    const headerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: '2C3E50' },
            left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        },
        rows: [
            new TableRow({
                children: [
                    cell([
                        para(client, { bold: true, size: 20 }),
                        para(`N° Audit: ${number}`, { size: 16, color: '6B7280' }),
                    ], 30, AlignmentType.LEFT),

                    cell([
                        para('RAPPORTO DI AUDIT INTERNO', { bold: true, size: 20, align: AlignmentType.CENTER }),
                        para('UNI EN ISO 9001:2015', { size: 16, color: '6B7280', align: AlignmentType.CENTER }),
                    ], 40, AlignmentType.CENTER),

                    cell([
                        para('Data audit:', { size: 16, color: '6B7280', align: AlignmentType.RIGHT }),
                        para(date, { bold: true, size: 18, align: AlignmentType.RIGHT }),
                    ], 30, AlignmentType.RIGHT),
                ]
            }),
        ],
    });

    return new Header({ children: [headerTable] });
}

// ─── Piè di pagina ───────────────────────────────────────────────────────────
/**
 * Piè di pagina 3 colonne:
 *   SX: Codice procedura
 *   CX: Numerazione pagine (Pag. X / Y)
 *   DX: Testo organizzazione
 *
 * Per personalizzare: cambia testo, colori o struttura qui sotto.
 */
function buildPageFooter(audit) {
    const meta = audit?.metadata || {};
    const seq = (meta.auditNumber || '').split('-')[1] || '01';
    const org = meta.organizationName || 'Sistema Gestione Qualità';

    const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

    const cell = (children, pct) => new TableCell({
        children: Array.isArray(children) ? children : [children],
        width: { size: pct, type: WidthType.PERCENTAGE },
        borders: BORDERS,
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
    });

    const pageNumberPara = new Paragraph({
        children: [
            new TextRun({ text: 'Pag. ', size: 16, color: '6B7280' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '2C3E50', bold: true }),
            new TextRun({ text: ' / ', size: 16, color: '6B7280' }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '2C3E50' }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
    });

    const footerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 6, color: '2C3E50' },
            bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        },
        rows: [
            new TableRow({
                children: [
                    cell(new Paragraph({
                        children: [new TextRun({ text: `PR${seq}.04 - Verifiche Ispettive Interne`, size: 16, color: '6B7280' })],
                        spacing: { before: 0, after: 0 },
                    }), 35),

                    cell(pageNumberPara, 30),

                    cell(new Paragraph({
                        children: [new TextRun({ text: org, size: 16, color: '6B7280' })],
                        alignment: AlignmentType.RIGHT,
                        spacing: { before: 0, after: 0 },
                    }), 35),
                ]
            }),
        ],
    });

    return new Footer({ children: [footerTable] });
}

// --- Costruisce il documento docx completo ---
function buildDocument(audit, getViewUrl = null) {
    const checklist = audit.checklist || {};
    const attachments = audit.attachments || [];
    const pending = audit.pendingIssues || [];
    const metrics = calculateMetrics(checklist);

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
                    run: { bold: true, size: 28, color: '2C3E50' },
                    paragraph: { spacing: { before: 360, after: 200 } },
                },
                {
                    id: 'Heading2',
                    name: 'heading 2',
                    basedOn: 'Normal',
                    next: 'Normal',
                    run: { bold: true, size: 24, color: '2C3E50' },
                    paragraph: { spacing: { before: 300, after: 160 } },
                },
            ],
        },
        sections: [{
            properties: {
                page: {
                    margin: { top: 1100, right: 720, bottom: 1000, left: 720 },
                },
            },
            headers: { default: buildPageHeader(audit) },
            footers: { default: buildPageFooter(audit) },
            children,
        }],
    });
}

function buildFileName(audit) {
    const client = (audit.metadata?.clientName || 'Cliente').replace(/[^a-z0-9]/gi, '_');
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
    const doc = buildDocument(audit, getViewUrl);
    const blob = await Packer.toBlob(doc);
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
        const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'documents' });
        const auditFolder = await dirHandle.getDirectoryHandle('Audit', { create: true });
        const year = audit.metadata.projectYear || new Date().getFullYear();
        const clientName = (audit.metadata.clientName || 'Cliente').replace(/[^a-z0-9]/gi, '_');
        const clientFolder = await auditFolder.getDirectoryHandle(`${year}-${clientName}`, { create: true });

        const doc = buildDocument(audit, null);
        const blob = await Packer.toBlob(doc);
        const fileName = buildFileName(audit);

        const fileHandle = await clientFolder.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
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
        const doc = buildDocument(audit, null);
        const blob = await Packer.toBlob(doc);
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const clientName = (audit.metadata.clientName || 'Cliente').replace(/[^a-z0-9]/gi, '_');
        const number = (audit.metadata.auditNumber || 'N-A').replace(/[^a-z0-9]/gi, '_');
        const fileName = `Audit_${number}_${clientName}_${timestamp}.docx`;

        const result = await fsProvider.saveReport(blob, fileName);
        return { success: true, path: result.path, fileName: result.fileName };
    } catch (error) {
        throw new Error(`Errore salvataggio report: ${error.message}`);
    }
}