/**
 * wordExport.js — Dispatcher per l'export Word dei report audit
 *
 * ARCHITETTURA:
 *   1. Carica il template .docx dal percorso /templates/<standard>-audit-report.docx
 *   2. Riempe i segnaposto testo {varName} tramite docxtemplater
 *   3. Inietta le tabelle colorate (checklist, rilievi) come OOXML raw
 *   4. Salva il file con file-saver
 *
 * AGGIUNGERE UN NUOVO STANDARD:
 *   1. Esegui: node scripts/generateTemplate<NewStandard>.js
 *   2. Aggiungi il mapping in TEMPLATE_MAP (qui sotto)
 *   3. Tutto il resto è automatico — nessuna altra modifica al codice
 *
 * SEGNAPOSTO NEL TEMPLATE:
 *   {clientName}             header + tutte le sezioni
 *   {auditNumber}            header
 *   {procedureCode}          header (es. PR01.04)
 *   {auditDate}              header + sezione 1
 *   {auditObject}            sezione 1
 *   {scope}                  sezione 1
 *   {referenceDocuments}     sezione 1
 *   {processes}              sezione 1
 *   {programCommunicatedDate}sezione 1
 *   {auditor}                sezione 1
 *   {objectiveDescription}   sezione 2
 *   {#participants}{role}    sezione 2 – loop partecipanti
 *   {name}{/participants}    sezione 2 – fine loop
 *   {conclusions}            sezione 11
 *   {ncCount}                sezione 11
 *   {ossCount}               sezione 11
 *   {omCount}                sezione 11
 *   {nvCount}                sezione 11
 *   {summaryText}            sezione 11
 *   CHECKLIST_MARKER         sostituito con buildChecklistSectionOoxml()
 *   RILIEVI_MARKER           sostituito con buildRileviSummaryOoxml()
 */

import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import {
    buildChecklistSectionOoxml,
    buildRileviSummaryOoxml,
    calculateMetrics
} from './wordExportHelpers.js';

// ─── Mappa template per standard ──────────────────────────────────────────────
// Chiave: valore di audit.metadata.standardCode  oppure primo key di audit.checklist
// Valore: percorso relativo a public/ (servito da Vite come asset statico)
const TEMPLATE_MAP = {
    'ISO_9001': '/templates/ISO9001-audit-report.docx',
    'ISO_14001': '/templates/ISO14001-audit-report.docx',
    'ISO_45001': '/templates/ISO45001-audit-report.docx',
    'default': '/templates/ISO9001-audit-report.docx'
};

// ─── Helpers interni ───────────────────────────────────────────────────────────
function getTemplateUrl(audit) {
    const fromMeta = audit?.metadata?.standardCode;
    if (fromMeta && TEMPLATE_MAP[fromMeta]) return TEMPLATE_MAP[fromMeta];
    // Fallback: prova a leggere il codice dal primo nodo della checklist
    const firstKey = audit?.checklist && Object.keys(audit.checklist)[0];
    if (firstKey) {
        const matched = Object.keys(TEMPLATE_MAP).find(k => firstKey.toUpperCase().includes(k.replace('_', '')));
        if (matched) return TEMPLATE_MAP[matched];
    }
    return TEMPLATE_MAP['default'];
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/D';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return String(dateStr);
        return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return String(dateStr);
    }
}

/** Mappa l'oggetto audit → variabili per docxtemplater */
function buildTemplateData(audit) {
    const meta = audit.metadata || {};
    const gd = meta.generalData || {};
    const obj = meta.auditObjective || {};
    const outcome = meta.auditOutcome || null;
    const m = calculateMetrics(audit.checklist);
    const seq = (meta.auditNumber || '').split('-')[1] || '01';

    return {
        // ── Header
        clientName: meta.clientName || 'Cliente',
        auditNumber: meta.auditNumber || 'N/A',
        procedureCode: `PR${seq}.04`,
        auditDate: formatDate(meta.auditDate),

        // ── Sezione 1 – Dati Generali
        auditObject: gd.auditObject || 'Audit di Verifica ispettiva interna',
        scope: gd.scope || 'Sistema di Gestione per la Qualità',
        referenceDocuments: Array.isArray(gd.referenceDocuments)
            ? gd.referenceDocuments.join(', ')
            : (gd.referenceDocuments || 'Norma UNI EN ISO 9001:2015'),
        processes: gd.processes || 'Tutti i processi aziendali',
        programCommunicatedDate: formatDate(gd.programCommunicatedDate),
        auditor: meta.auditor || 'N/D',

        // ── Sezione 2 – Obiettivo
        objectiveDescription: obj.description ||
            'Verificare il grado di implementazione del Sistema di Gestione della Qualità ' +
            'secondo la norma UNI EN ISO 9001:2015 e il rispetto delle procedure interne.',

        // Loop partecipanti: docxtemplater ripete la riga per ogni elemento
        participants: (obj.participants || []).map(p => ({
            role: p.role || 'N/D',
            name: p.name || ''
        })),

        // ── Sezione 11 – Esito
        conclusions: outcome?.conclusions || 'Nessuna conclusione documentata.',
        ncCount: String(m.totalNC),
        ossCount: String(m.totalOSS),
        omCount: String(m.totalOM),
        nvCount: String(m.totalNV),
        summaryText: outcome?.emergingFindings?.summary ||
            `Totale domande: ${m.total} | Risposte: ${m.answered} | ` +
            `NC: ${m.totalNC} | OSS: ${m.totalOSS} | OM: ${m.totalOM}` +
            (m.totalNV > 0 ? ` | NV: ${m.totalNV}` : '')
    };
}

/**
 * Trova il paragrafo contenente il marker e lo sostituisce con l'OOXML fornito.
 * Usa solo string operations (indexOf/lastIndexOf) — niente regex fragile.
 */
function replaceMarker(xml, marker, replacementXml) {
    const idx = xml.indexOf(marker);
    if (idx === -1) {
        console.warn(`[wordExport] Marker non trovato: "${marker}" — aggiorna il template con node scripts/generateTemplate.js`);
        return xml;
    }
    const pStart = xml.lastIndexOf('<w:p', idx);
    const pEnd = xml.indexOf('</w:p>', idx);
    if (pStart === -1 || pEnd === -1) return xml;
    return xml.slice(0, pStart) + replacementXml + xml.slice(pEnd + 6);
}

/** Inietta le tabelle colorate nei marker del documento già processato da docxtemplater */
function injectOoxmlMarkers(zip, audit, getViewUrl) {
    let xml = zip.files['word/document.xml'].asText();

    xml = replaceMarker(
        xml,
        'CHECKLIST_MARKER',
        buildChecklistSectionOoxml(
            audit.checklist,
            audit.attachments || [],
            audit.pendingIssues || [],
            getViewUrl
        )
    );

    xml = replaceMarker(
        xml,
        'RILIEVI_MARKER',
        buildRileviSummaryOoxml(audit.checklist)
    );

    zip.file('word/document.xml', xml);
}

/** Genera il blob .docx dal template e dai dati dell'audit */
async function generateDocxBlob(audit, getViewUrl) {
    const templateUrl = getTemplateUrl(audit);
    let arrayBuffer;
    try {
        const resp = await fetch(templateUrl);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        arrayBuffer = await resp.arrayBuffer();
    } catch (e) {
        throw new Error(
            `Impossibile caricare il template Word "${templateUrl}": ${e.message}.\n` +
            `Esegui: node scripts/generateTemplate.js`
        );
    }

    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter() { return ''; }
    });
    doc.render(buildTemplateData(audit));

    const processedZip = doc.getZip();
    injectOoxmlMarkers(processedZip, audit, getViewUrl);

    return processedZip.generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
}

function buildFileName(audit) {
    const client = (audit.metadata?.clientName || 'Cliente').replace(/[^a-z0-9]/gi, '_');
    const number = (audit.metadata?.auditNumber || 'N-A').replace(/[^a-z0-9]/gi, '_');
    return `Audit_${number}_${client}.docx`;
}

// ─── API pubblica (stessa firma del vecchio wordExport.js) ────────────────────

/**
 * Genera e scarica il report Word.
 * @param {Object}        audit      oggetto audit completo (metadata + checklist + attachments)
 * @param {Function|null} getViewUrl callback (attachmentId) → url stringa, oppure null
 * @returns {Promise<string>} nome del file scaricato
 */
export async function exportAuditToWord(audit, getViewUrl = null) {
    if (!audit?.metadata) throw new Error('Audit non valido: metadata mancante');
    const blob = await generateDocxBlob(audit, getViewUrl);
    const fileName = buildFileName(audit);
    saveAs(blob, fileName);
    return fileName;
}

/**
 * Salva il report Word in una cartella selezionata dall'utente (File System Access API).
 * Fallback blob download su mobile/Android.
 */
export async function exportAuditToFileSystem(audit) {
    if (!audit?.metadata) throw new Error('Audit non valido: metadata mancante');

    if (!window.showDirectoryPicker) {
        console.warn('⚠️ File System Access API non disponibile — fallback download');
        const fileName = await exportAuditToWord(audit);
        return { success: true, path: 'Download/' + fileName, fileName, fallback: true };
    }

    try {
        const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'documents' });
        const auditFolder = await dirHandle.getDirectoryHandle('Audit', { create: true });
        const year = audit.metadata.projectYear || new Date().getFullYear();
        const clientName = (audit.metadata.clientName || 'Cliente').replace(/[^a-z0-9]/gi, '_');
        const clientFolder = await auditFolder.getDirectoryHandle(`${year}-${clientName}`, { create: true });

        const blob = await generateDocxBlob(audit, null);
        const fileName = buildFileName(audit);

        const fileHandle = await clientFolder.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        return { success: true, path: `Audit/${year}-${clientName}/${fileName}`, fileName };
    } catch (error) {
        if (error.name === 'AbortError') throw new Error("Salvataggio annullato dall'utente");
        throw error;
    }
}

/**
 * Salva il report tramite LocalFsProvider (struttura ISO 9001).
 * Fallback blob download se workspace non disponibile.
 */
export async function exportAuditToWorkspace(audit, fsProvider) {
    if (!audit?.metadata) throw new Error('Audit non valido: metadata mancante');

    if (!window.showDirectoryPicker || !fsProvider?.ready()) {
        const reason = !window.showDirectoryPicker
            ? 'File System Access API non disponibile (mobile)'
            : 'Workspace non configurato';
        console.warn(`⚠️ ${reason} — fallback download`);
        const fileName = await exportAuditToWord(audit);
        return { success: true, path: 'Download/' + fileName, fileName, fallback: true };
    }

    try {
        const blob = await generateDocxBlob(audit, null);
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const clientName = (audit.metadata.clientName || 'Cliente').replace(/[^a-z0-9]/gi, '_');
        const number = (audit.metadata.auditNumber || 'N-A').replace(/[^a-z0-9]/gi, '_');
        const fileName = `Audit_${number}_${clientName}_${timestamp}.docx`;

        const result = await fsProvider.saveReport(blob, fileName);
        return { success: true, path: result.path, fileName: result.fileName };
    } catch (error) {
        console.error('Errore export workspace:', error);
        throw new Error(`Errore salvataggio report: ${error.message}`);
    }
}
