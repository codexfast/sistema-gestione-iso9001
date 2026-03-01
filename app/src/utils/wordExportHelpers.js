/**
 * wordExportHelpers.js
 * Genera OOXML raw per le sezioni con formattazione condizionale (tabelle colorate).
 * Usato da wordExport.js dopo che docxtemplater ha riempito i segnaposto testo.
 *
 * AGGIUNGERE UN NUOVO STANDARD: basta cambiare i titoli/etichette qui e creare
 * un nuovo template .docx con gli stessi marker (CHECKLIST_MARKER, RILIEVI_MARKER).
 */

// ─── Palette colori ────────────────────────────────────────────────────────────
const CLR = {
    primary: '2C3E50',
    lightGray: 'E5E7EB',
    success: 'D1FAE5', successTxt: '065F46',
    warning: 'FEF3C7', warningTxt: '92400E',
    danger: 'FEE2E2', dangerTxt: '991B1B',
    info: 'DBEAFE', infoTxt: '1E40AF',
    purple: 'F3E8FF', purpleTxt: '6B21A8',
    white: 'FFFFFF',
    black: '000000',
    attachBg: 'EFF6FF'
};

export const STATUS_CFG = {
    C: { label: 'Conforme', fill: CLR.success, text: CLR.successTxt },
    NC: { label: 'Non Conforme', fill: CLR.danger, text: CLR.dangerTxt },
    OSS: { label: 'Osservazione', fill: CLR.warning, text: CLR.warningTxt },
    OM: { label: 'Opp. Miglioramento', fill: CLR.info, text: CLR.infoTxt },
    NA: { label: 'Non Applicabile', fill: CLR.lightGray, text: '374151' },
    NV: { label: 'Non Valutato', fill: CLR.purple, text: CLR.purpleTxt },
    NOT_ANSWERED: { label: '', fill: CLR.white, text: CLR.black }
};

// ─── Micro-helpers OOXML ───────────────────────────────────────────────────────

/** Escaping XML obbligatorio */
export function escXml(val) {
    if (val == null) return '';
    return String(val)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Run di testo OOXML
 * @param {string} text
 * @param {{ bold?, italic?, color?, size? }} opts
 */
function xmlRun(text, opts = {}) {
    const b = opts.bold ? '<w:b/>' : '';
    const i = opts.italic ? '<w:i/>' : '';
    const c = opts.color ? `<w:color w:val="${opts.color}"/>` : '';
    const sz = opts.size ? `<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>` : '';
    const rPr = (b || i || c || sz) ? `<w:rPr>${b}${i}${c}${sz}</w:rPr>` : '';
    const sp = /^ | $/.test(String(text)) ? ' xml:space="preserve"' : '';
    return `<w:r>${rPr}<w:t${sp}>${escXml(text)}</w:t></w:r>`;
}

/**
 * Paragrafo OOXML
 * @param {string|string[]} content  testo o array di xmlRun()
 * @param {{ style?, align?, bold?, italic?, color?, size?, sb?, sa?, pageBreak? }} opts
 */
function xmlPara(content, opts = {}) {
    const style = opts.style ? `<w:pStyle w:val="${opts.style}"/>` : '';
    const jc = opts.align ? `<w:jc w:val="${opts.align}"/>` : '';
    const spacing = (opts.sb != null || opts.sa != null)
        ? `<w:spacing w:before="${opts.sb ?? 0}" w:after="${opts.sa ?? 160}"/>`
        : '';
    const pb = opts.pageBreak ? '<w:pageBreakBefore/>' : '';
    const pPr = (style || jc || spacing || pb)
        ? `<w:pPr>${style}${jc}${spacing}${pb}</w:pPr>` : '';
    const runs = Array.isArray(content)
        ? content.join('')
        : typeof content === 'string'
            ? xmlRun(content, opts)
            : content;
    return `<w:p>${pPr}${runs}</w:p>`;
}

/**
 * Cella tabella OOXML
 * @param {string} content  XML dei paragrafi interni (già renderizzati)
 * @param {{ fill?, width?, span?, va?, ml?, mr? }} opts
 */
function xmlCell(content, opts = {}) {
    const span = opts.span ? `<w:gridSpan w:val="${opts.span}"/>` : '';
    const width = opts.width ? `<w:tcW w:w="${opts.width}" w:type="pct"/>` : '';
    const fill = opts.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${opts.fill}"/>` : '';
    const va = `<w:vAlign w:val="${opts.va ?? 'center'}"/>`;
    const ml = opts.ml ?? 100, mr = opts.mr ?? 100;
    const mar = `<w:tcMar>
        <w:top w:w="80" w:type="dxa"/>
        <w:left w:w="${ml}" w:type="dxa"/>
        <w:bottom w:w="80" w:type="dxa"/>
        <w:right w:w="${mr}" w:type="dxa"/>
    </w:tcMar>`;
    const tcPr = `<w:tcPr>${span}${width}${fill}${va}${mar}</w:tcPr>`;
    // content può essere già XML o stringa semplice
    const body = content.startsWith('<w:') ? content : xmlPara(content);
    return `<w:tc>${tcPr}${body}</w:tc>`;
}

/**
 * Riga tabella OOXML
 * @param {string[]} cells  array di xmlCell()
 * @param {{ header? }} opts
 */
function xmlRow(cells, opts = {}) {
    const trPr = opts.header ? '<w:trPr><w:tblHeader/></w:trPr>' : '';
    return `<w:tr w:rsidR="00AA0000">${trPr}${cells.join('')}</w:tr>`;
}

const STD_BORDERS = `<w:tblBorders>
    <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
</w:tblBorders>`;

/**
 * Tabella OOXML
 * @param {string[]} rows    array di xmlRow()
 * @param {number[]} colWidths  larghezze colonne in unità pct (50 = 1%)
 * @param {number}   pct    percentuale larghezza tabella (default 100)
 */
function xmlTable(rows, colWidths = [], pct = 100) {
    const grid = colWidths.length
        ? `<w:tblGrid>${colWidths.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`
        : '<w:tblGrid/>';
    return `<w:tbl>
    <w:tblPr>
        <w:tblStyle w:val="TableGrid"/>
        <w:tblW w:w="${pct * 50}" w:type="pct"/>
        ${STD_BORDERS}
        <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
    </w:tblPr>
    ${grid}
    ${rows.join('')}
</w:tbl>`;
}

// ─── Calcolo metriche ──────────────────────────────────────────────────────────
export function calculateMetrics(checklist) {
    const m = {
        totalC: 0, totalNC: 0, totalOSS: 0, totalOM: 0,
        totalNA: 0, totalNV: 0, totalNotAnswered: 0,
        total: 0, answered: 0
    };
    if (!checklist) return m;

    Object.values(checklist).forEach(normData => {
        if (!normData || typeof normData !== 'object') return;
        Object.values(normData).forEach(clause => {
            if (!clause?.questions) return;
            clause.questions.forEach(q => {
                m.total++;
                switch (q.status) {
                    case 'C': m.totalC++; m.answered++; break;
                    case 'NC': m.totalNC++; m.answered++; break;
                    case 'OSS': m.totalOSS++; m.answered++; break;
                    case 'OM': m.totalOM++; m.answered++; break;
                    case 'NA': m.totalNA++; m.answered++; break;
                    case 'NV': m.totalNV++; m.answered++; break;
                    default: m.totalNotAnswered++;
                }
            });
        });
    });
    return m;
}

// ─── Tabella Partecipanti ──────────────────────────────────────────────────────
export function buildParticipantsOoxml(participants = []) {
    if (!participants.length) return '';

    const headerRow = xmlRow([
        xmlCell(xmlPara(xmlRun('Funzione', { bold: true }), { align: 'center' }), { fill: CLR.lightGray, width: 1500 }),
        xmlCell(xmlPara(xmlRun('Nome e Cognome', { bold: true }), { align: 'center' }), { fill: CLR.lightGray, width: 3500 })
    ], { header: true });

    const dataRows = participants.map(p =>
        xmlRow([
            xmlCell(xmlPara(escXml(p.role || 'N/D')), { width: 1500, va: 'top' }),
            xmlCell(xmlPara(escXml(p.name || '')), { width: 3500, va: 'top' })
        ])
    );

    return (
        xmlPara(xmlRun("Presenti per l'organizzazione:", { bold: true }), { sb: 300, sa: 150 }) +
        xmlTable([headerRow, ...dataRows], [1500, 3500])
    );
}

// ─── Rilievi Pendenti ──────────────────────────────────────────────────────────
function buildPendingIssuesOoxml(pendingIssues = []) {
    const open = pendingIssues.filter(pi => {
        const s = pi.status || pi.issue_status || 'open';
        return s !== 'resolved';
    });

    if (!open.length) {
        return xmlPara('Nessun rilievo pendente da audit precedenti.', { italic: true, sa: 400 });
    }

    const STATUS_LABEL = {
        open: { label: 'Aperto', fill: CLR.danger, text: CLR.dangerTxt },
        in_progress: { label: 'In corso', fill: CLR.warning, text: CLR.warningTxt },
        persists: { label: 'Persistente', fill: CLR.danger, text: CLR.dangerTxt }
    };

    const headerRow = xmlRow([
        xmlCell(xmlPara(xmlRun('Rif. norma', { bold: true }), { align: 'center' }), { fill: CLR.lightGray, width: 750 }),
        xmlCell(xmlPara(xmlRun('Descrizione rilievo', { bold: true }), { align: 'center' }), { fill: CLR.lightGray, width: 2500 }),
        xmlCell(xmlPara(xmlRun('Audit sorgente', { bold: true }), { align: 'center' }), { fill: CLR.lightGray, width: 1000 }),
        xmlCell(xmlPara(xmlRun('Stato', { bold: true }), { align: 'center' }), { fill: CLR.lightGray, width: 750 })
    ], { header: true });

    const dataRows = open.map(pi => {
        const clauseRef = pi.clause || pi.requirement_reference || pi.section_id || '—';
        const description = pi.description || pi.nc_description || 'N/D';
        const sourceAudit = pi.originAuditNumber || pi.nc_number
            || (pi.source_audit_id ? `ID ${pi.source_audit_id}` : '—');
        const rawStatus = pi.status || pi.issue_status || 'open';
        const sCfg = STATUS_LABEL[rawStatus] || STATUS_LABEL.open;
        const notes = pi.resolutionNotes || pi.follow_up_notes || '';

        const descContent = xmlPara(escXml(description))
            + (notes ? xmlPara(xmlRun('↳ ' + notes, { italic: true, color: '6B7280' }), { sb: 60, sa: 0 }) : '');

        return xmlRow([
            xmlCell(xmlPara(escXml(clauseRef), { align: 'center' }), { width: 750, va: 'top' }),
            xmlCell(descContent, { width: 2500, va: 'top' }),
            xmlCell(xmlPara(escXml(sourceAudit), { align: 'center' }), { width: 1000, va: 'top' }),
            xmlCell(
                xmlPara(xmlRun(sCfg.label, { bold: true, color: sCfg.text }), { align: 'center' }),
                { width: 750, fill: sCfg.fill, va: 'center' }
            )
        ]);
    });

    return xmlTable([headerRow, ...dataRows], [750, 2500, 1000, 750]);
}

// ─── Tabella clausola (checklist) ─────────────────────────────────────────────
function buildClauseTableOoxml(questions = [], auditAttachments = [], getViewUrl = null) {
    const COL = [2250, 1000, 1750]; // pct units (2250=45%, 1000=20%, 1750=35%)

    const headerRow = xmlRow([
        xmlCell(xmlPara(xmlRun('Attività/processo', { bold: true }), { align: 'center' }), { fill: CLR.lightGray, width: COL[0] }),
        xmlCell(xmlPara(xmlRun('Valutazione di efficacia', { bold: true }), { align: 'center' }), { fill: CLR.lightGray, width: COL[1] }),
        xmlCell(xmlPara(xmlRun('Dettaglio attività operative auditate', { bold: true }), { align: 'center' }), { fill: CLR.lightGray, width: COL[2] })
    ], { header: true });

    if (!questions.length) {
        const emptyRow = xmlRow([xmlCell(
            xmlPara(xmlRun('Nessuna domanda presente in questa clausola.', { italic: true }), { align: 'center' }),
            { span: 3 }
        )]);
        return xmlTable([headerRow, emptyRow], COL);
    }

    const allRows = [];
    questions.forEach(q => {
        const cfg = STATUS_CFG[q.status] || STATUS_CFG.NOT_ANSWERED;
        const qRef = q.clauseRef || '';
        const qTxt = q.question || q.text || 'Domanda non definita';
        const fullTxt = qRef ? `${qRef} - ${qTxt}` : qTxt;
        const notes = (q.notes && q.notes.trim()) ? q.notes.trim() : '—';

        // Riga domanda principale
        allRows.push(xmlRow([
            xmlCell(xmlPara(escXml(fullTxt), { sa: 0 }), { width: COL[0], va: 'top' }),
            xmlCell(
                xmlPara(xmlRun(cfg.label, { bold: true, color: cfg.text }), { align: 'center' }),
                { width: COL[1], fill: cfg.fill, va: 'center' }
            ),
            xmlCell(xmlPara(escXml(notes), { sa: 0 }), { width: COL[2], va: 'top' })
        ]));

        // Riga allegati (se presenti)
        const qId = q.questionId;
        const qAtts = qId != null
            ? auditAttachments.filter(a => Number(a.questionId) === Number(qId))
            : [];

        if (qAtts.length) {
            const attParts = qAtts.map(a => {
                const name = a.fileName || a.name || 'File';
                const aId = a.id || a.attachment_id;
                const url = (getViewUrl && aId) ? `  [${getViewUrl(aId)}]` : '';
                return escXml(name) + url;
            });
            const attLine = '📎 Allegati: ' + attParts.join('   |   ');

            allRows.push(xmlRow([
                xmlCell(
                    xmlPara(xmlRun(attLine, { color: '1E40AF', size: 18 }), { sa: 0 }),
                    { span: 3, fill: CLR.attachBg, ml: 150 }
                )
            ]));
        }
    });

    return xmlTable([headerRow, ...allRows], COL);
}

// ─── Sezione Checklist completa (Rilievi Pendenti + clausole) ─────────────────
/**
 * Genera l'intero blocco OOXML da iniettare al posto di CHECKLIST_MARKER.
 * Contiene: heading "3 - RILIEVI PENDENTI", tabella pendenti, poi un heading + tabella per ogni clausola.
 */
export function buildChecklistSectionOoxml(checklist, auditAttachments = [], pendingIssues = [], getViewUrl = null) {
    let xml = '';

    // ── 3 - Rilievi Pendenti
    xml += xmlPara('3 - RILIEVI PENDENTI', { style: 'Heading1', sb: 0, sa: 300 });
    xml += buildPendingIssuesOoxml(pendingIssues);
    xml += xmlPara('', { pageBreak: true, sa: 0 });

    if (!checklist || !Object.keys(checklist).length) return xml;

    // ── Clausole (ordinate numericamente)
    Object.entries(checklist).forEach(([, normData]) => {
        if (!normData || typeof normData !== 'object') return;

        const clauses = Object.entries(normData).sort(([a], [b]) => {
            const nA = parseFloat(a.match(/\d+/)?.[0] || 0);
            const nB = parseFloat(b.match(/\d+/)?.[0] || 0);
            return nA - nB;
        });

        clauses.forEach(([clauseKey, clause]) => {
            if (!clause || typeof clause !== 'object') return;
            const num = clauseKey.match(/\d+/)?.[0] || clauseKey;
            const title = (clause.title || '').replace(/^\d+\.?\s*-?\s*/, '');

            xml += xmlPara(`${num} - ${title.toUpperCase()}`, { style: 'Heading1', sb: 400, sa: 200 });
            xml += buildClauseTableOoxml(clause.questions || [], auditAttachments, getViewUrl);
            xml += xmlPara('', { sa: 300 });
        });
    });

    return xml;
}

// ─── Tabella Rilievi Summary (per sezione Esito) ───────────────────────────────
/**
 * Genera la tabella "Elemento | CONF | NC | OSS | OM | N.A." da iniettare al posto di RILIEVI_MARKER.
 */
export function buildRileviSummaryOoxml(checklist) {
    if (!checklist || !Object.keys(checklist).length) {
        return xmlPara('Checklist non disponibile per generare la sintesi rilievi.', { italic: true });
    }

    const COLS = [2500, 500, 500, 500, 500, 500]; // pct
    const FILL_MAP = { CONF: CLR.success, NC: CLR.danger, OSS: CLR.warning, OM: CLR.info, 'N.A.': CLR.lightGray };

    const headerRow = xmlRow(
        ['Elemento / Processo della norma auditato', 'CONF', 'NC', 'OSS', 'OM', 'N.A.'].map((h, i) =>
            xmlCell(
                xmlPara(xmlRun(h, { bold: true, size: 18 }), { align: 'center' }),
                { fill: CLR.lightGray, width: COLS[i] }
            )
        ),
        { header: true }
    );

    // Riga AP fissa
    const apRow = xmlRow([
        xmlCell('AP  Azioni pendenti derivanti da precedenti Audit', { width: COLS[0] }),
        xmlCell(xmlPara(xmlRun('X', { bold: true }), { align: 'center' }), { fill: CLR.success, width: COLS[1] }),
        ...['NC', 'OSS', 'OM', 'N.A.'].map((_, i) => xmlCell(xmlPara(''), { width: COLS[i + 2] }))
    ]);

    const rows = [headerRow, apRow];

    Object.values(checklist).forEach(normData => {
        if (!normData || typeof normData !== 'object') return;

        const clauses = Object.entries(normData).sort(([a], [b]) => {
            const nA = parseFloat(a.match(/\d+/)?.[0] || 0);
            const nB = parseFloat(b.match(/\d+/)?.[0] || 0);
            return nA - nB;
        });

        clauses.forEach(([, clause]) => {
            if (!clause?.questions) return;

            clause.questions.forEach(q => {
                let col = '';
                if (q.status === 'C') col = 'CONF';
                else if (q.status === 'NC') col = 'NC';
                else if (q.status === 'OSS') col = 'OSS';
                else if (q.status === 'OM') col = 'OM';
                else if (q.status === 'NA' || q.status === 'NV') col = 'N.A.';

                const ref = q.clauseRef || q.id || '';
                const title = (q.title || q.text || '').replace(/^\d+\.?\d*\.?\d*\s*-?\s*/, '');

                const statusCells = ['CONF', 'NC', 'OSS', 'OM', 'N.A.'].map((k, i) =>
                    col === k
                        ? xmlCell(xmlPara(xmlRun('X', { bold: true }), { align: 'center' }), { fill: FILL_MAP[k], width: COLS[i + 1] })
                        : xmlCell(xmlPara(''), { width: COLS[i + 1] })
                );

                rows.push(xmlRow([
                    xmlCell(`${escXml(ref)}  ${escXml(title)}`, { width: COLS[0] }),
                    ...statusCells
                ]));
            });
        });
    });

    return xmlTable(rows, COLS);
}
