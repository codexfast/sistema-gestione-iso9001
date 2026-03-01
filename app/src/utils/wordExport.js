/**
 * wordExport.js — Export Word audit ISO 9001
 *
 * ARCHITETTURA (template-based):
 *   1. Carica app/public/templates/ISO9001-audit-report.docx
 *      └─ Questo file puoi aprire e modificare in Word:
 *         header, footer, logo, font, colori, stili titoli, testo fisso.
 *         NON rimuovere i segnaposto {varName} e i marker CHECKLIST/RILIEVI.
 *
 *   2. docxtemplater sostituisce i segnaposto testo:
 *         {clientName}  {auditDate}  {auditNumber}  {procedureCode}
 *         {auditObject}  {scope}  {referenceDocuments}  {processes}
 *         {programCommunicatedDate}  {auditor}  {objectiveDescription}
 *         {#participants}{role}{name}{/participants}
 *         {conclusions}  {ncCount}  {ossCount}  {omCount}  {nvCount}  {summaryText}
 *
 *   3. wordExportHelpers.js genera le tabelle colorate come OOXML
 *
 *   4. injectOoxmlMarkers() sostituisce i marker nel XML del .docx:
 *         CHECKLIST_MARKER  → sezione rilievi pendenti + tutte le clausole
 *         RILIEVI_MARKER    → tabella sintesi CONF/NC/OSS/OM/N.A.
 *
 * AGGIUNGERE UN NUOVO STANDARD:
 *   1. Ottieni il template: copia ISO9001-audit-report.docx, rinominalo e aprilo in Word
 *   2. Modifica titoli/sezioni a piacere, salva
 *   3. Aggiungi la mappatura in TEMPLATE_MAP (qui sotto)
 *   Zero modifiche al codice per layout/branding!
 */

import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import {
    buildChecklistSectionOoxml,
    buildRileviSummaryOoxml,
    calculateMetrics,
} from './wordExportHelpers.js';

// ─── Mappa standard → template ────────────────────────────────────────────────
const TEMPLATE_MAP = {
    'ISO_9001':  '/templates/ISO9001-audit-report.docx',
    'ISO_14001': '/templates/ISO14001-audit-report.docx',
    'ISO_45001': '/templates/ISO45001-audit-report.docx',
    'default':   '/templates/ISO9001-audit-report.docx',
};

function getTemplateUrl(audit) {
    const code = audit?.metadata?.standardCode;
    if (code && TEMPLATE_MAP[code]) return TEMPLATE_MAP[code];
    return TEMPLATE_MAP['default'];
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/D';
    try {
        const d = new Date(dateStr);
        return isNaN(d.getTime())
            ? String(dateStr)
            : d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return String(dateStr); }
}

function buildTemplateData(audit) {
    const meta    = audit.metadata       || {};
    const gd      = meta.generalData     || {};
    const obj     = meta.auditObjective  || {};
    const outcome = meta.auditOutcome    || {};
    const m       = calculateMetrics(audit.checklist);
    const seq     = (meta.auditNumber || '').split('-')[1] || '01';

    return {
        clientName:             meta.clientName  || 'Cliente',
        auditNumber:            meta.auditNumber || 'N/A',
        procedureCode:          'PR' + seq + '.04',
        auditDate:              formatDate(meta.auditDate),
        auditObject:            gd.auditObject   || 'Audit di Verifica ispettiva interna',
        scope:                  gd.scope         || 'Sistema di Gestione per la Qualit\u00e0',
        referenceDocuments:     Array.isArray(gd.referenceDocuments)
            ? gd.referenceDocuments.join(', ')
            : (gd.referenceDocuments || 'UNI EN ISO 9001:2015'),
        processes:              gd.processes     || 'Tutti i processi aziendali',
        programCommunicatedDate: formatDate(gd.programCommunicatedDate),
        auditor:                meta.auditor     || 'N/D',
        objectiveDescription:   obj.description  ||
            'Verificare il grado di implementazione del Sistema di Gestione della Qualit\u00e0 ' +
            'secondo la norma UNI EN ISO 9001:2015.',
        participants: (obj.participants || []).map(p => ({
            role: p.role || 'N/D',
            name: p.name || '',
        })),
        conclusions: outcome.conclusions || 'Nessuna conclusione documentata.',
        ncCount:     String(m.totalNC),
        ossCount:    String(m.totalOSS),
        omCount:     String(m.totalOM),
        nvCount:     String(m.totalNV),
        summaryText: outcome.emergingFindings?.summary ||
            'Totale: ' + m.total + ' | Risposte: ' + m.answered +
            ' | NC: ' + m.totalNC + ' | OSS: ' + m.totalOSS + ' | OM: ' + m.totalOM,
    };
}

/**
 * Trova il paragrafo contenente il marker e lo sostituisce con l OOXML fornito.
 * Versione robusta: usa carattere per carattere per trovare <w:p> e non <w:pPr>.
 */
function replaceMarker(xml, marker, replacementXml) {
    const idx = xml.indexOf(marker);
    if (idx === -1) {
        console.warn('[wordExport] Marker non trovato: "' + marker + '" — rigenera il template con: node scripts/generateTemplate.js');
        return xml;
    }

    // Cammina a ritroso finche non trova <w:p seguita da spazio o >
    // (esclude <w:pPr>, <w:pStyle> ecc. che hanno altri caratteri dopo <w:p)
    let pStart = idx - 1;
    while (pStart >= 4) {
        if (
            xml[pStart]   === '<' &&
            xml[pStart+1] === 'w' &&
            xml[pStart+2] === ':' &&
            xml[pStart+3] === 'p' &&
            (xml[pStart+4] === ' ' || xml[pStart+4] === '>')
        ) break;
        pStart--;
    }

    const pEnd = xml.indexOf('</w:p>', idx);
    if (pStart < 4 || pEnd < 0) {
        console.error('[wordExport] Impossibile trovare il paragrafo del marker "' + marker + '"');
        return xml;
    }

    return xml.slice(0, pStart) + replacementXml + xml.slice(pEnd + 6);
}

function injectOoxmlMarkers(zip, audit, getViewUrl) {
    let xml = zip.files['word/document.xml'].asText();

    xml = replaceMarker(
        xml,
        'CHECKLIST_MARKER',
        buildChecklistSectionOoxml(
            audit.checklist,
            audit.attachments   || [],
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

async function generateDocxBlob(audit, getViewUrl) {
    const templateUrl = getTemplateUrl(audit);
    let arrayBuffer;
    try {
        const resp = await fetch(templateUrl);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        arrayBuffer = await resp.arrayBuffer();
    } catch (e) {
        throw new Error(
            'Impossibile caricare il template "' + templateUrl + '": ' + e.message + '\n' +
            'Esegui: node scripts/generateTemplate.js'
        );
    }

    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks:    true,
        nullGetter()   { return ''; },
    });

    doc.render(buildTemplateData(audit));
    const processedZip = doc.getZip();

    injectOoxmlMarkers(processedZip, audit, getViewUrl);

    return processedZip.generate({
        type:     'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
}

function buildFileName(audit) {
    const client = (audit.metadata?.clientName  || 'Cliente').replace(/[^a-z0-9]/gi, '_');
    const number = (audit.metadata?.auditNumber || 'N-A').replace(/[^a-z0-9]/gi, '_');
    return 'Audit_' + number + '_' + client + '.docx';
}

// ─── API pubblica (firma invariata rispetto alla versione precedente) ─────────

export async function exportAuditToWord(audit, getViewUrl = null) {
    if (!audit?.metadata) throw new Error('Audit non valido: metadata mancante');
    const blob     = await generateDocxBlob(audit, getViewUrl);
    const fileName = buildFileName(audit);
    saveAs(blob, fileName);
    return fileName;
}

export async function exportAuditToFileSystem(audit) {
    if (!audit?.metadata) throw new Error('Audit non valido: metadata mancante');
    if (!window.showDirectoryPicker) {
        const fileName = await exportAuditToWord(audit);
        return { success: true, path: 'Download/' + fileName, fileName, fallback: true };
    }
    try {
        const dirHandle    = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'documents' });
        const auditFolder  = await dirHandle.getDirectoryHandle('Audit',  { create: true });
        const year         = audit.metadata.projectYear || new Date().getFullYear();
        const clientName   = (audit.metadata.clientName || 'Cliente').replace(/[^a-z0-9]/gi, '_');
        const clientFolder = await auditFolder.getDirectoryHandle(year + '-' + clientName, { create: true });
        const blob         = await generateDocxBlob(audit, null);
        const fileName     = buildFileName(audit);
        const fileHandle   = await clientFolder.getFileHandle(fileName, { create: true });
        const writable     = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return { success: true, path: 'Audit/' + year + '-' + clientName + '/' + fileName, fileName };
    } catch (error) {
        if (error.name === 'AbortError') throw new Error('Salvataggio annullato');
        throw error;
    }
}

export async function exportAuditToWorkspace(audit, fsProvider) {
    if (!audit?.metadata) throw new Error('Audit non valido: metadata mancante');
    if (!window.showDirectoryPicker || !fsProvider?.ready()) {
        const fileName = await exportAuditToWord(audit);
        return { success: true, path: 'Download/' + fileName, fileName, fallback: true };
    }
    try {
        const blob      = await generateDocxBlob(audit, null);
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const client    = (audit.metadata.clientName  || 'Cliente').replace(/[^a-z0-9]/gi, '_');
        const number    = (audit.metadata.auditNumber || 'N-A').replace(/[^a-z0-9]/gi, '_');
        const fileName  = 'Audit_' + number + '_' + client + '_' + timestamp + '.docx';
        const result    = await fsProvider.saveReport(blob, fileName);
        return { success: true, path: result.path, fileName: result.fileName };
    } catch (error) {
        throw new Error('Errore salvataggio report: ' + error.message);
    }
}
