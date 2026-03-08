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
// PER AGGIUNGERE UNA NUOVA NORMA: inserire qui la coppia chiave→percorso template.
// Nient'altro da modificare nel codice.
const TEMPLATE_MAP = {
    'ISO_9001':   '/templates/ISO9001-audit-report.docx',
    'ISO_14001':  '/templates/ISO14001-audit-report.docx',
    'ISO_45001':  '/templates/ISO45001-audit-report.docx',
    'ISO_3834_2': '/templates/ISO3834-audit-report.docx',
    'default':    '/templates/ISO9001-audit-report.docx',
};

/**
 * Normalizza una chiave standard al formato usato in TEMPLATE_MAP.
 * 'ISO_9001_2015' → 'ISO_9001'  |  'ISO_14001' → 'ISO_14001'
 * Usata sia per la selezione del template che per il filtraggio della checklist.
 */
function normalizeStdKey(key) {
    if (!key) return 'default';
    const k = String(key).toUpperCase().trim();
    if (TEMPLATE_MAP[k]) return k;
    // Rimuovi suffisso anno: ISO_9001_2015 → ISO_9001, ISO_3834_2_2021 → ISO_3834_2
    const withoutYear = k.replace(/_\d{4}$/, '');
    if (TEMPLATE_MAP[withoutYear]) return withoutYear;
    // Gestione ISO 3834 con varianti (ISO_3834, ISO_3834_2, ISO_3834_2_2021)
    if (k.includes('3834')) return 'ISO_3834_2';
    return 'default';
}

function getTemplateUrl(standardKey) {
    return TEMPLATE_MAP[normalizeStdKey(standardKey)] || TEMPLATE_MAP['default'];
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
        auditor:                meta.auditorName || meta.auditors?.[0] || meta.auditor || 'N/D',
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

function injectOoxmlMarkers(zip, audit, getViewUrl, options = {}) {
    const imageRegistry = options.photoMode === 'preview' ? [] : null;
    let xml = zip.files['word/document.xml'].asText();

    xml = replaceMarker(
        xml,
        'CHECKLIST_MARKER',
        buildChecklistSectionOoxml(
            audit.checklist,
            audit.attachments           || [],
            audit.pendingIssues         || [],
            getViewUrl,
            options,
            imageRegistry,
            audit.certificationFindings || [],
            audit.normExcerpts          || {}
        )
    );

    xml = replaceMarker(
        xml,
        'RILIEVI_MARKER',
        buildRileviSummaryOoxml(audit.checklist)
    );

    // Margini stretti (1.27 cm = 720 DXA) — sostituisce i margini del template
    // senza toccare il file .docx sorgente (evita manipolazione binaria)
    xml = xml.replace(
        /w:top="\d+" w:right="\d+" w:bottom="\d+" w:left="\d+"([^/]*w:header)/,
        'w:top="720" w:right="720" w:bottom="720" w:left="720"$1'
    );

    zip.file('word/document.xml', xml);

    // Embedded images: aggiungi file media + relazioni nel zip
    if (imageRegistry && imageRegistry.length > 0) {
        embedImagesInZip(zip, imageRegistry);
    }
}

/**
 * Aggiunge le immagini al zip Word e aggiorna il file delle relazioni.
 * @param {PizZip} zip
 * @param {Array<{rId,imgId,base64,mimeType,ext}>} imageRegistry
 */
function embedImagesInZip(zip, imageRegistry) {
    // Leggi relazioni esistenti
    const relsPath = 'word/_rels/document.xml.rels';
    let relsXml = zip.files[relsPath]?.asText() || '';

    imageRegistry.forEach(({ rId, base64, mimeType, ext }) => {
        // Strip il prefisso data URL: "data:image/jpeg;base64,..."
        const b64Data = base64.includes(',') ? base64.split(',')[1] : base64;

        // Scrivi nel zip come file binario
        const mediaPath = `word/media/${rId}.${ext}`;
        zip.file(mediaPath, b64Data, { base64: true });

        // Aggiungi relazione
        const relEntry = `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${rId}.${ext}"/>`;
        relsXml = relsXml.replace('</Relationships>', relEntry + '</Relationships>');
    });

    zip.file(relsPath, relsXml);
    console.log(`[wordExport] ${imageRegistry.length} immagini embedded nel documento.`);
}

async function generateDocxBlob(audit, getViewUrl, options = {}) {
    const rawKey    = options.standardKey || null;
    const normKey   = rawKey ? normalizeStdKey(rawKey) : null;

    // Filtra la checklist alla sola norma richiesta.
    // La chiave nella checklist può essere 'ISO_9001' o 'ISO_9001_2015':
    // cerca la prima chiave che si normalizza al valore atteso.
    let checklistFiltered = audit.checklist || {};
    if (normKey) {
        const matchKey = Object.keys(checklistFiltered)
            .find(k => normalizeStdKey(k) === normKey);
        checklistFiltered = matchKey
            ? { [matchKey]: checklistFiltered[matchKey] }
            : { [normKey]: {} };
    }

    const auditForGen = { ...audit, checklist: checklistFiltered };
    const templateUrl = getTemplateUrl(normKey || Object.keys(checklistFiltered)[0]);
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

    doc.render(buildTemplateData(auditForGen));
    const processedZip = doc.getZip();

    injectOoxmlMarkers(processedZip, auditForGen, getViewUrl, options);

    return processedZip.generate({
        type:     'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
}

/**
 * Pre-carica le immagini degli allegati come base64 per l'embedding nel Word.
 * Modifica audit.attachments in-place aggiungendo imageBase64.
 */
async function preloadImagesIntoAudit(audit, getViewUrl) {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const attachments = audit.attachments || [];
    await Promise.allSettled(
        attachments.map(async (att) => {
            // Prima verifica: tipo salvato nel DB
            if (!imageTypes.includes(att.mimeType)) return;
            const id = att.serverAttachmentId || att.id;
            if (!id) return;
            try {
                const url = getViewUrl(id);
                const resp = await fetch(url);
                if (!resp.ok) return;
                const blob = await resp.blob();
                // Seconda verifica: tipo REALE restituito dal server
                // Se il server dice che è un PDF o altro, non lo trattiamo come immagine
                const realMimeType = blob.type || att.mimeType;
                if (!imageTypes.includes(realMimeType)) {
                    console.warn('[wordExport] allegato ignorato: tipo reale non è immagine', { stored: att.mimeType, real: realMimeType, id });
                    return;
                }
                att.imageBase64   = await blobToBase64(blob);
                att.imageMimeType = realMimeType;
            } catch (e) {
                console.warn('[wordExport] preload image failed for att', id, e.message);
            }
        })
    );
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function buildFileName(audit, standardKey = null) {
    const client = (audit.metadata?.clientName  || 'Cliente').replace(/[^a-z0-9]/gi, '_');
    const number = (audit.metadata?.auditNumber || 'N-A').replace(/[^a-z0-9]/gi, '_');
    const stdSuffix = standardKey ? '_' + standardKey.replace(/^ISO_/, 'ISO').replace(/_/g, '') : '';
    return 'Audit_' + number + '_' + client + stdSuffix + '.docx';
}

// ─── API pubblica (firma invariata rispetto alla versione precedente) ─────────

export async function exportAuditToWord(audit, getViewUrl = null, options = {}) {
    if (!audit?.metadata) throw new Error('Audit non valido: metadata mancante');
    const blob     = await generateDocxBlob(audit, getViewUrl, options);
    const fileName = buildFileName(audit, options.standardKey || null);
    saveAs(blob, fileName);
    return fileName;
}

export async function exportAuditToFileSystem(audit, getViewUrl = null, options = {}) {
    if (!audit?.metadata) throw new Error('Audit non valido: metadata mancante');
    if (!window.showDirectoryPicker) {
        const fileName = await exportAuditToWord(audit, getViewUrl, options);
        return { success: true, path: 'Download/' + fileName, fileName, fallback: true };
    }
    try {
        const dirHandle    = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'documents' });
        const auditFolder  = await dirHandle.getDirectoryHandle('Audit',  { create: true });
        const year         = audit.metadata.projectYear || new Date().getFullYear();
        const clientName   = (audit.metadata.clientName || 'Cliente').replace(/[^a-z0-9]/gi, '_');
        const clientFolder = await auditFolder.getDirectoryHandle(year + '-' + clientName, { create: true });
        const blob         = await generateDocxBlob(audit, getViewUrl, options);
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

export async function exportAuditToWorkspace(audit, fsProvider, getViewUrl = null, options = {}) {
    if (!audit?.metadata) throw new Error('Audit non valido: metadata mancante');
    if (!window.showDirectoryPicker || !fsProvider?.ready()) {
        const fileName = await exportAuditToWord(audit, getViewUrl, options);
        return { success: true, path: 'Download/' + fileName, fileName, fallback: true };
    }
    try {
        const blob      = await generateDocxBlob(audit, getViewUrl, options);
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
