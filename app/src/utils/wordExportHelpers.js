/**
 * wordExportHelpers.js
 * Genera stringhe OOXML raw per le sezioni dinamiche del report audit.
 *
 * COSA MODIFICARE QUI (senza toccare il template Word):
 *   - Colori celle per stato: STATUS_CFG
 *   - Struttura tabella checklist: buildClauseTableOoxml()
 *   - Struttura tabella riepilogo: buildRileviSummaryOoxml()
 *
 * COSA MODIFICARE NEL TEMPLATE .docx (senza toccare il codice):
 *   - Header: logo, nome azienda, stile
 *   - Footer: numeri di pagina, testo legale
 *   - Font, colori testo, margini, stili titoli
 *   => Apri app/public/templates/ISO9001-audit-report.docx in Word
 */

// Nomi leggibili dei standard — aggiungere qui nuovi standard
const STANDARD_LABELS = {
    ISO_9001:   'ISO 9001:2015 — Sistema di Gestione per la Qualità',
    ISO_14001:  'ISO 14001:2015 — Sistema di Gestione Ambientale',
    ISO_45001:  'ISO 45001:2018 — Sistema di Gestione per la Salute e Sicurezza sul Lavoro',
    ISO_3834_2: 'ISO 3834-2:2021 — Requisiti di qualità per la saldatura per fusione',
};

/**
 * Estrae il numero di sezione dalla chiave della clausola.
 * "14001_s4" → "4",  "clause4" → "4",  "section_10" → "10", "9001_p2" → "2"
 */
function extractSectionNum(key) {
    const afterMarker = key.match(/[_-][a-z](\d+)$/i);      // es. _s4, _p2
    if (afterMarker) return afterMarker[1];
    const nums = key.match(/\d+/g);
    if (nums && nums.length >= 2) return nums[nums.length - 1]; // es. 14001_4 → "4"
    return nums ? nums[0] : key;
}

export const STATUS_CFG = {
    C:           { label: 'Conforme',           fill: 'D1FAE5', text: '065F46' },
    NC:          { label: 'Non Conforme',        fill: 'FEE2E2', text: '991B1B' },
    OSS:         { label: 'Osservazione',        fill: 'FEF3C7', text: '92400E' },
    OM:          { label: 'Opp. Miglioramento',  fill: 'DBEAFE', text: '1E40AF' },
    NA:          { label: 'Non Applicabile',     fill: 'E5E7EB', text: '374151' },
    NV:          { label: 'Non Valutato',        fill: 'F3E8FF', text: '6B21A8' },
    NOT_ANSWERED:{ label: '\u2014',             fill: 'FFFFFF', text: '000000' },
};

/** Escape obbligatorio per inserire testo in XML */
export function escXml(val) {
    if (val == null) return '';
    return String(val)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Contatori NC/C/OSS/OM/NA/NV/totali */
export function calculateMetrics(checklist) {
    const m = { totalC:0, totalNC:0, totalOSS:0, totalOM:0, totalNA:0, totalNV:0,
                totalNotAnswered:0, total:0, answered:0 };
    if (!checklist) return m;
    Object.values(checklist).forEach(normData => {
        if (!normData || typeof normData !== 'object') return;
        Object.values(normData).forEach(clause => {
            if (!clause?.questions) return;
            clause.questions.forEach(q => {
                m.total++;
                switch (q.status) {
                    case 'C':   m.totalC++;   m.answered++; break;
                    case 'NC':  m.totalNC++;  m.answered++; break;
                    case 'OSS': m.totalOSS++; m.answered++; break;
                    case 'OM':  m.totalOM++;  m.answered++; break;
                    case 'NA':  m.totalNA++;  m.answered++; break;
                    case 'NV':  m.totalNV++;  m.answered++; break;
                    default:    m.totalNotAnswered++;
                }
            });
        });
    });
    return m;
}

// ─── Micro-helpers OOXML ───────────────────────────────────────────────────────
function xmlRun(text, opts = {}) {
    const b  = opts.bold  ? '<w:b/>'  : '';
    const i  = opts.ital  ? '<w:i/>'  : '';
    const c  = opts.color ? `<w:color w:val="${opts.color}"/>` : '';
    const sz = opts.size  ? `<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>` : '';
    const rPr = (b||i||c||sz) ? `<w:rPr>${b}${i}${c}${sz}</w:rPr>` : '';
    const t   = String(text ?? '');
    const sp  = (t.startsWith(' ') || t.endsWith(' ')) ? ' xml:space="preserve"' : '';
    return `<w:r>${rPr}<w:t${sp}>${escXml(t)}</w:t></w:r>`;
}

function xmlPara(content, opts = {}) {
    const style = opts.style    ? `<w:pStyle w:val="${opts.style}"/>` : '';
    const jc    = opts.align    ? `<w:jc w:val="${opts.align}"/>` : '';
    const sp    = (opts.sb != null || opts.sa != null)
        ? `<w:spacing w:before="${opts.sb ?? 0}" w:after="${opts.sa ?? 160}"/>` : '';
    const pb    = opts.pageBreak ? '<w:pageBreakBefore/>' : '';
    const pPr   = (style||jc||sp||pb) ? `<w:pPr>${style}${jc}${sp}${pb}</w:pPr>` : '';
    const body  = Array.isArray(content)
        ? content.join('')
        : (typeof content === 'string' && content.startsWith('<w:'))
            ? content
            : xmlRun(content, opts);
    return `<w:p>${pPr}${body}</w:p>`;
}

function xmlCell(content, opts = {}) {
    const span = opts.span ? `<w:gridSpan w:val="${opts.span}"/>` : '';
    const w    = opts.pct  ? `<w:tcW w:w="${opts.pct * 50}" w:type="pct"/>` : '';
    const fill = opts.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${opts.fill}"/>` : '';
    const va   = `<w:vAlign w:val="${opts.va ?? 'center'}"/>`;
    const ml   = opts.ml ?? 100, mr = opts.mr ?? 100;
    const mar  = `<w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="${ml}" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="${mr}" w:type="dxa"/></w:tcMar>`;
    const tcPr = `<w:tcPr>${span}${w}${fill}${va}${mar}</w:tcPr>`;
    const body = (typeof content === 'string' && content.startsWith('<w:')) ? content : xmlPara(content);
    return `<w:tc>${tcPr}${body}</w:tc>`;
}

function xmlRow(cells, opts = {}) {
    const trPr = opts.header ? '<w:trPr><w:tblHeader/></w:trPr>' : '';
    return `<w:tr w:rsidR="00AA0000">${trPr}${cells.join('')}</w:tr>`;
}

const STD_BORDERS = [
    '<w:tblBorders>',
    '<w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>',
    '<w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>',
    '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>',
    '<w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>',
    '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>',
    '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>',
    '</w:tblBorders>',
].join('');

function xmlTable(rows, colPcts = [], pct = 100) {
    const grid = colPcts.length
        ? `<w:tblGrid>${colPcts.map(p => `<w:gridCol w:w="${p * 50}"/>`).join('')}</w:tblGrid>`
        : '<w:tblGrid/>';
    return `<w:tbl><w:tblPr><w:tblW w:w="${pct * 50}" w:type="pct"/>${STD_BORDERS}</w:tblPr>${grid}${rows.join('')}</w:tbl>`;
}

// ─── Rilievi pendenti ──────────────────────────────────────────────────────────
function buildPendingIssuesOoxml(pendingIssues = []) {
    const open = (pendingIssues || []).filter(pi =>
        (pi.status || pi.issue_status || 'open') !== 'resolved'
    );
    if (!open.length)
        return xmlPara('Nessun rilievo pendente da audit precedenti.', { ital: true, sa: 400 });

    const S = {
        open:        { label: 'Aperto',      fill: 'FEE2E2', text: '991B1B' },
        in_progress: { label: 'In corso',    fill: 'FEF3C7', text: '92400E' },
        persists:    { label: 'Persistente', fill: 'FEE2E2', text: '991B1B' },
    };
    const PCT = [10, 46, 28, 16];

    const headerRow = xmlRow([
        xmlCell(xmlPara(xmlRun('Rif.',           { bold: true }), { align: 'center' }), { fill: 'E5E7EB', pct: PCT[0] }),
        xmlCell(xmlPara(xmlRun('Descrizione',    { bold: true }), { align: 'center' }), { fill: 'E5E7EB', pct: PCT[1] }),
        xmlCell(xmlPara(xmlRun('Audit sorgente', { bold: true }), { align: 'center' }), { fill: 'E5E7EB', pct: PCT[2] }),
        xmlCell(xmlPara(xmlRun('Stato',          { bold: true }), { align: 'center' }), { fill: 'E5E7EB', pct: PCT[3] }),
    ], { header: true });

    const dataRows = open.map(pi => {
        const sCfg  = S[pi.status || pi.issue_status || 'open'] || S.open;
        const notes = pi.resolutionNotes || pi.follow_up_notes || '';
        const descBody = xmlPara(escXml(pi.description || pi.nc_description || 'N/D'))
            + (notes ? xmlPara(xmlRun('\u21b3 ' + notes, { ital: true, color: '6B7280' }), { sb: 60, sa: 0 }) : '');
        return xmlRow([
            xmlCell(xmlPara(escXml(pi.clause || pi.section_id || '\u2014'), { align: 'center' }), { pct: PCT[0] }),
            xmlCell(descBody, { pct: PCT[1] }),
            xmlCell(xmlPara(escXml(
                pi.originAuditNumber || pi.nc_number ||
                (pi.source_audit_id ? 'ID ' + pi.source_audit_id : '\u2014')
            ), { align: 'center' }), { pct: PCT[2] }),
            xmlCell(xmlPara(xmlRun(sCfg.label, { bold: true, color: sCfg.text }), { align: 'center' }),
                { fill: sCfg.fill, pct: PCT[3] }),
        ]);
    });

    return xmlTable([headerRow, ...dataRows], PCT);
}

// ─── Helpers immagini embedded ────────────────────────────────────────────────
const IMAGE_EXTS = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };
const IMAGE_MIME_TYPES = new Set(Object.keys(IMAGE_EXTS));

/** Genera OOXML per un'immagine embedded (200x150px → 1905000x1428750 EMU) */
function xmlImageOoxml(rId, imgId, widthEmu = 1905000, heightEmu = 1428750) {
    const name = `img${imgId}`;
    return `<w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${widthEmu}" cy="${heightEmu}"/><wp:docPr id="${imgId}" name="${name}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:off x="0" y="0"/><a:ext cx="${widthEmu}" cy="${heightEmu}"/></a:xfrm><a:prstGeom xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

// ─── Tabella singola clausola ──────────────────────────────────────────────────
function buildClauseTableOoxml(questions = [], auditAttachments = [], getViewUrl = null, options = {}, imageRegistry = null) {
    const COL = [45, 18, 37];

    const headerRow = xmlRow([
        xmlCell(xmlPara(xmlRun('Attivit\u00e0/processo',                     { bold: true }), { align: 'center' }), { fill: 'E5E7EB', pct: COL[0] }),
        xmlCell(xmlPara(xmlRun('Valutazione di efficacia',                    { bold: true }), { align: 'center' }), { fill: 'E5E7EB', pct: COL[1] }),
        xmlCell(xmlPara(xmlRun('Dettaglio attivit\u00e0 operative auditate', { bold: true }), { align: 'center' }), { fill: 'E5E7EB', pct: COL[2] }),
    ], { header: true });

    if (!questions.length) {
        return xmlTable([
            headerRow,
            xmlRow([xmlCell(xmlPara('Nessuna domanda presente.', { ital: true }), { span: 3 })]),
        ], COL);
    }

    const usePreview = options.photoMode === 'preview' && Array.isArray(imageRegistry);
    const allRows = [headerRow];

    questions.forEach(q => {
        const cfg   = STATUS_CFG[q.status] || STATUS_CFG.NOT_ANSWERED;
        const qRef  = q.clauseRef || '';
        const qTxt  = q.question || q.text || 'Domanda non definita';
        const full  = escXml(qRef ? qRef + ' - ' + qTxt : qTxt);
        const notes = (q.notes && q.notes.trim()) ? escXml(q.notes.trim()) : '\u2014';

        allRows.push(xmlRow([
            xmlCell(xmlPara(full,  { sa: 0 }), { pct: COL[0], va: 'top' }),
            xmlCell(xmlPara(xmlRun(cfg.label, { bold: true, color: cfg.text }), { align: 'center' }),
                { fill: cfg.fill, pct: COL[1] }),
            xmlCell(xmlPara(notes, { sa: 0 }), { pct: COL[2], va: 'top' }),
        ]));

        const qId   = q.questionId;
        const qAtts = qId != null
            ? (auditAttachments || []).filter(a => Number(a.questionId) === Number(qId))
            : [];

        if (qAtts.length) {
            qAtts.forEach(a => {
                const name = escXml(a.fileName || a.name || 'File');
                const aId  = a.id || a.attachment_id || a.serverAttachmentId;
                const url  = (getViewUrl && aId) ? getViewUrl(aId) : null;
                const isImage = IMAGE_MIME_TYPES.has(a.mimeType);

                if (usePreview && isImage && a.imageBase64) {
                    // Registra immagine e usa rId dedicato (base: 100 + indice per evitare collisioni)
                    const imgIdx = imageRegistry.length;
                    const rId = `rId${100 + imgIdx}`;
                    const imgId = 100 + imgIdx;
                    const ext = IMAGE_EXTS[a.mimeType] || 'jpg';
                    imageRegistry.push({ rId, imgId, base64: a.imageBase64, mimeType: a.mimeType, ext });

                    const imgXml = xmlImageOoxml(rId, imgId);
                    const linkText = url ? `  \uD83D\uDD17 ${name}  [${url}]` : `  ${name}`;
                    allRows.push(xmlRow([
                        xmlCell(
                            `<w:p><w:pPr><w:jc w:val="left"/></w:pPr>${imgXml}</w:p>` +
                            xmlPara(xmlRun(escXml(linkText), { color: '1E40AF', size: 18 }), { sa: 0 }),
                            { span: 3, fill: 'EFF6FF', ml: 150 }
                        ),
                    ]));
                } else {
                    // Modalità link (default)
                    const linkPart = url ? `  [${url}]` : '';
                    const attText = '\uD83D\uDCCE ' + name + linkPart;
                    allRows.push(xmlRow([
                        xmlCell(xmlPara(xmlRun(attText, { color: '1E40AF', size: 18 }), { sa: 0 }),
                            { span: 3, fill: 'EFF6FF', ml: 150 }),
                    ]));
                }
            });
        }
    });

    return xmlTable(allRows, COL);
}

// ─── Rilievi ente certificatore (sezione 1.4) ─────────────────────────────────
function buildCertFindingsOoxml(certFindings = []) {
    if (!certFindings || !certFindings.length)
        return xmlPara('Nessun rilievo dell\'ente certificatore registrato.', { ital: true, sa: 400 });

    const TYPE_COLOR = { NC: 'DC2626', OBS: 'D97706', RIM: '7C3AED' };
    const STATUS_CFG = {
        open:        { label: 'Aperto',   fill: 'FEE2E2', text: '991B1B' },
        in_progress: { label: 'In Corso', fill: 'FEF3C7', text: '92400E' },
        closed:      { label: 'Chiuso',   fill: 'DCFCE7', text: '166534' },
    };
    const PCT = [8, 8, 10, 32, 14, 12, 16];

    const headerRow = xmlRow([
        xmlCell(xmlPara(xmlRun('N°',       { bold: true }), { align: 'center' }), { fill: 'E5E7EB', pct: PCT[0] }),
        xmlCell(xmlPara(xmlRun('Tipo',     { bold: true }), { align: 'center' }), { fill: 'E5E7EB', pct: PCT[1] }),
        xmlCell(xmlPara(xmlRun('Punto',    { bold: true }), { align: 'center' }), { fill: 'E5E7EB', pct: PCT[2] }),
        xmlCell(xmlPara(xmlRun('Descrizione / Azione Correttiva', { bold: true }), { align: 'center' }), { fill: 'E5E7EB', pct: PCT[3] }),
        xmlCell(xmlPara(xmlRun('Ente',     { bold: true }), { align: 'center' }), { fill: 'E5E7EB', pct: PCT[4] }),
        xmlCell(xmlPara(xmlRun('Scadenza', { bold: true }), { align: 'center' }), { fill: 'E5E7EB', pct: PCT[5] }),
        xmlCell(xmlPara(xmlRun('Stato',    { bold: true }), { align: 'center' }), { fill: 'E5E7EB', pct: PCT[6] }),
    ], { header: true });

    const dataRows = certFindings.map(f => {
        const sCfg = STATUS_CFG[f.status] || STATUS_CFG.open;
        const tColor = TYPE_COLOR[f.finding_type] || 'DC2626';
        const descBody = xmlPara(escXml(f.description || '—'))
            + (f.corrective_action
                ? xmlPara(xmlRun('↳ AC: ' + f.corrective_action, { ital: true, color: '1D4ED8' }), { sb: 60, sa: 0 })
                : '');
        const dueDate = f.due_date
            ? new Date(f.due_date).toLocaleDateString('it-IT')
            : '—';
        return xmlRow([
            xmlCell(xmlPara(escXml(f.finding_number || '—'), { align: 'center' }), { pct: PCT[0] }),
            xmlCell(xmlPara(xmlRun(f.finding_type || 'NC', { bold: true, color: tColor }), { align: 'center' }), { pct: PCT[1] }),
            xmlCell(xmlPara(escXml(f.clause_ref || '—'), { align: 'center' }), { pct: PCT[2] }),
            xmlCell(descBody, { pct: PCT[3] }),
            xmlCell(xmlPara(escXml(f.certifying_body || '—'), { align: 'center' }), { pct: PCT[4] }),
            xmlCell(xmlPara(escXml(dueDate), { align: 'center' }), { pct: PCT[5] }),
            xmlCell(xmlPara(xmlRun(sCfg.label, { bold: true, color: sCfg.text }), { align: 'center' }),
                { fill: sCfg.fill, pct: PCT[6] }),
        ]);
    });

    return xmlTable([headerRow, ...dataRows], PCT);
}

// ─── Sezione checklist completa (iniettata in CHECKLIST_MARKER) ───────────────
export function buildChecklistSectionOoxml(checklist, auditAttachments = [], pendingIssues = [], getViewUrl = null, options = {}, imageRegistry = null, certFindings = []) {
    let xml = '';

    xml += xmlPara('3 - RILIEVI PENDENTI', { sb: 0, sa: 300 });
    xml += buildPendingIssuesOoxml(pendingIssues);

    xml += xmlPara('', { sa: 200 }); // spaziatura
    xml += xmlPara('1.4 - RILIEVI DELL\'ENTE CERTIFICATORE', { sb: 0, sa: 300 });
    xml += buildCertFindingsOoxml(certFindings);

    if (!checklist || !Object.keys(checklist).length) return xml;

    Object.entries(checklist).forEach(([stdKey, normData]) => {
        if (!normData || typeof normData !== 'object') return;

        const stdLabel = STANDARD_LABELS[stdKey] || stdKey;
        xml += xmlPara('', { pageBreak: true, sa: 0 });
        xml += xmlPara(
            escXml('CHECKLIST — ' + stdLabel),
            { sb: 0, sa: 300 }
        );

        Object.entries(normData)
            .sort(([a], [b]) =>
                (parseInt(extractSectionNum(a), 10) || 0) -
                (parseInt(extractSectionNum(b), 10) || 0)
            )
            .forEach(([clauseKey, clause]) => {
                if (!clause || typeof clause !== 'object') return;
                const num   = extractSectionNum(clauseKey);
                const title = (clause.title || '').replace(/^\d+\.?\s*[-–]\s*/, '');
                const headingText = num + ' \u2014 ' + title.toUpperCase();
                // Usa Heading2: appare nel sommario (TOC) del documento Word
                xml += xmlPara(
                    xmlRun(headingText, { bold: true, size: 24, color: '1D4ED8' }),
                    { style: 'Heading2', pageBreak: true, sb: 0, sa: 200 }
                );
                xml += buildClauseTableOoxml(clause.questions || [], auditAttachments, getViewUrl, options, imageRegistry);
                xml += xmlPara('', { sa: 300 });
            });
    });

    return xml;
}

// ─── Tabella sintesi rilievi (iniettata in RILIEVI_MARKER) ────────────────────
export function buildRileviSummaryOoxml(checklist) {
    if (!checklist || !Object.keys(checklist).length)
        return xmlPara('Checklist non disponibile.', { ital: true });

    const FILL = { CONF: 'D1FAE5', NC: 'FEE2E2', OSS: 'FEF3C7', OM: 'DBEAFE', 'N.A.': 'E5E7EB' };
    const PCT  = [40, 12, 12, 12, 12, 12];

    const headerRow = xmlRow(
        ['Elemento / Processo della norma', 'CONF', 'NC', 'OSS', 'OM', 'N.A.'].map((h, i) =>
            xmlCell(xmlPara(xmlRun(h, { bold: true, size: 18 }), { align: 'center' }),
                { fill: 'E5E7EB', pct: PCT[i] })
        ),
        { header: true }
    );

    const apRow = xmlRow([
        xmlCell('AP  Azioni pendenti da audit precedenti', { pct: PCT[0] }),
        xmlCell(xmlPara(xmlRun('X', { bold: true }), { align: 'center' }), { fill: FILL.CONF, pct: PCT[1] }),
        ...['NC', 'OSS', 'OM', 'N.A.'].map((_, i) => xmlCell(xmlPara(''), { pct: PCT[i + 2] })),
    ]);

    const rows = [headerRow, apRow];

    Object.entries(checklist).forEach(([stdKey, normData]) => {
        if (!normData || typeof normData !== 'object') return;

        // Riga separatore per standard (in blu chiaro, a tutta larghezza)
        const stdLabel = STANDARD_LABELS[stdKey] || stdKey;
        rows.push(xmlRow([
            xmlCell(
                xmlPara(xmlRun(stdLabel, { bold: true, size: 18 }), { align: 'center' }),
                { span: 6, fill: 'DBEAFE', pct: 100 }
            ),
        ]));

        Object.entries(normData)
            .sort(([a], [b]) =>
                (parseInt(extractSectionNum(a), 10) || 0) -
                (parseInt(extractSectionNum(b), 10) || 0)
            )
            .forEach(([, clause]) => {
                if (!clause?.questions) return;
                clause.questions.forEach(q => {
                    let col = '';
                    if      (q.status === 'C')                       col = 'CONF';
                    else if (q.status === 'NC')                      col = 'NC';
                    else if (q.status === 'OSS')                     col = 'OSS';
                    else if (q.status === 'OM')                      col = 'OM';
                    else if (q.status === 'NA' || q.status === 'NV') col = 'N.A.';

                    const ref   = q.clauseRef || q.id || '';
                    const title = (q.title || q.text || '').replace(/^\d+\.?\d*\.?\d*\s*-?\s*/, '');
                    const label = escXml([ref, title].filter(Boolean).join('  '));

                    rows.push(xmlRow([
                        xmlCell(label, { pct: PCT[0] }),
                        ...['CONF', 'NC', 'OSS', 'OM', 'N.A.'].map((k, i) =>
                            col === k
                                ? xmlCell(xmlPara(xmlRun('X', { bold: true }), { align: 'center' }),
                                    { fill: FILL[k], pct: PCT[i + 1] })
                                : xmlCell(xmlPara(''), { pct: PCT[i + 1] })
                        ),
                    ]));
                });
            });
    });

    return xmlTable(rows, PCT);
}
