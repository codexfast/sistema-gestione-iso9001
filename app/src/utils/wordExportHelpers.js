/**
 * wordExportHelpers.js
 * Genera oggetti `docx` (v8) per le sezioni del report audit ISO 9001.
 * Usato da wordExport.js per costruire il documento senza template Word.
 */

import {
    Paragraph, TextRun, Table, TableRow, TableCell,
    HeadingLevel, AlignmentType, WidthType, BorderStyle,
    ShadingType, VerticalAlign, PageBreak
} from 'docx';

// --- Palette colori ---
const CLR = {
    primary:    '2C3E50',
    lightGray:  'E5E7EB',
    success:    'D1FAE5', successTxt: '065F46',
    warning:    'FEF3C7', warningTxt: '92400E',
    danger:     'FEE2E2', dangerTxt:  '991B1B',
    info:       'DBEAFE', infoTxt:    '1E40AF',
    purple:     'F3E8FF', purpleTxt:  '6B21A8',
    attachBg:   'EFF6FF',
    white:      'FFFFFF',
    black:      '000000',
};

export const STATUS_CFG = {
    C:           { label: 'Conforme',           fill: CLR.success,   text: CLR.successTxt },
    NC:          { label: 'Non Conforme',        fill: CLR.danger,    text: CLR.dangerTxt  },
    OSS:         { label: 'Osservazione',        fill: CLR.warning,   text: CLR.warningTxt },
    OM:          { label: 'Opp. Miglioramento',  fill: CLR.info,      text: CLR.infoTxt    },
    NA:          { label: 'Non Applicabile',     fill: CLR.lightGray, text: '374151'       },
    NV:          { label: 'Non Valutato',        fill: CLR.purple,    text: CLR.purpleTxt  },
    NOT_ANSWERED:{ label: 'Non Risposto',        fill: CLR.white,     text: CLR.black      },
};

const STD_BORDERS = {
    top:             { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    bottom:          { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    left:            { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    right:           { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    insideHorizontal:{ style: BorderStyle.SINGLE, size: 4, color: '000000' },
    insideVertical:  { style: BorderStyle.SINGLE, size: 4, color: '000000' },
};

// --- Helpers interni ---
function mkPara(text, opts = {}) {
    const runs = Array.isArray(text) ? text : [
        new TextRun({
            text:   String(text ?? ''),
            bold:   opts.bold   ?? false,
            italic: opts.italic ?? false,
            color:  opts.color  ?? undefined,
            size:   opts.size   ?? undefined,
        })
    ];
    return new Paragraph({
        children:  runs,
        heading:   opts.heading   ?? undefined,
        alignment: opts.align     ?? undefined,
        spacing:   { before: opts.sb ?? 0, after: opts.sa ?? 160 },
        ...(opts.pageBreakBefore ? { pageBreakBefore: true } : {}),
    });
}

function mkRun(text, opts = {}) {
    return new TextRun({
        text:   String(text ?? ''),
        bold:   opts.bold   ?? false,
        italic: opts.italic ?? false,
        color:  opts.color  ?? undefined,
        size:   opts.size   ?? undefined,
        break:  opts.break  ?? undefined,
    });
}

function mkCell(children, opts = {}) {
    const shadingOpts = opts.fill
        ? { type: ShadingType.CLEAR, color: 'auto', fill: opts.fill }
        : undefined;
    return new TableCell({
        children: Array.isArray(children) ? children : [children],
        shading:  shadingOpts,
        verticalAlign: opts.va ?? VerticalAlign.CENTER,
        columnSpan: opts.span ?? undefined,
        width: opts.pct
            ? { size: opts.pct, type: WidthType.PERCENTAGE }
            : opts.dxa
                ? { size: opts.dxa, type: WidthType.DXA }
                : undefined,
        margins: { top: 80, bottom: 80, left: opts.ml ?? 100, right: opts.mr ?? 100 },
    });
}

function mkTable(rows, opts = {}) {
    return new Table({
        rows,
        width:   { size: opts.pct ?? 100, type: WidthType.PERCENTAGE },
        borders: opts.borders ?? STD_BORDERS,
    });
}

const emptyPara   = () => mkPara('', { sa: 0 });
const pageBreakP  = () => new Paragraph({ children: [new PageBreak()], spacing: { before: 0, after: 0 } });

function formatDate(dateStr) {
    if (!dateStr) return 'N/D';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return String(dateStr);
        return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return String(dateStr); }
}

// --- Metriche ---
export function calculateMetrics(checklist) {
    const m = { totalC:0, totalNC:0, totalOSS:0, totalOM:0, totalNA:0, totalNV:0, totalNotAnswered:0, total:0, answered:0 };
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

// --- Header documento ---
export function buildHeaderTable(audit) {
    const meta = audit.metadata || {};
    const seq  = (meta.auditNumber || '').split('-')[1] || '01';
    const lbl  = (t) => mkCell(mkPara(t, { bold: true, size: 18 }),                      { fill: CLR.lightGray, pct: 20 });
    const val  = (t) => mkCell(mkPara(String(t ?? 'N/D'), { size: 18 }),                 { pct: 30 });
    return [
        mkTable([
            new TableRow({ children: [
                mkCell(mkPara('RAPPORTO DI AUDIT INTERNO', {
                    bold: true, size: 28, align: AlignmentType.CENTER
                }), { span: 4, fill: CLR.primary }),
            ]}),
            new TableRow({ children: [lbl('Cliente'),    val(meta.clientName || 'N/D'),  lbl('N° Audit'),  val(meta.auditNumber || 'N/D')] }),
            new TableRow({ children: [lbl('Data Audit'), val(formatDate(meta.auditDate)),lbl('Procedura'), val(`PR${seq}.04`)] }),
            new TableRow({ children: [lbl('Auditor'),    val(meta.auditor || 'N/D'),     lbl('Standard'),  val('UNI EN ISO 9001:2015')] }),
        ]),
        emptyPara(),
    ];
}

// --- Sezione 1 Dati Generali ---
export function buildGeneralDataSection(audit) {
    const meta = audit.metadata || {};
    const gd   = meta.generalData || {};
    const lbl  = (t) => mkCell(mkPara(t, { bold: true, size: 18 }),        { fill: CLR.lightGray, pct: 30 });
    const val  = (t) => mkCell(mkPara(String(t ?? 'N/D'), { size: 18 }),   { pct: 70 });
    return [
        mkPara('1 - DATI GENERALI', { heading: HeadingLevel.HEADING_1, sb: 360, sa: 200 }),
        mkTable([
            new TableRow({ children: [lbl("Oggetto dell'audit"),          val(gd.auditObject   || 'Audit di Verifica ispettiva interna')] }),
            new TableRow({ children: [lbl('Campo di applicazione'),       val(gd.scope         || 'Sistema di Gestione per la Qualità')] }),
            new TableRow({ children: [lbl('Documenti di riferimento'),    val(Array.isArray(gd.referenceDocuments) ? gd.referenceDocuments.join(', ') : (gd.referenceDocuments || 'UNI EN ISO 9001:2015'))] }),
            new TableRow({ children: [lbl('Processi verificati'),         val(gd.processes     || 'Tutti i processi aziendali')] }),
            new TableRow({ children: [lbl('Comunicazione programma'),     val(formatDate(gd.programCommunicatedDate))] }),
            new TableRow({ children: [lbl('Auditor'),                     val(meta.auditor     || 'N/D')] }),
        ]),
        emptyPara(),
    ];
}

// --- Sezione 2 Obiettivo e Partecipanti ---
export function buildObjectiveSection(audit) {
    const meta         = audit.metadata || {};
    const obj          = meta.auditObjective || {};
    const participants = Array.isArray(obj.participants) ? obj.participants : [];
    const blocks = [
        mkPara('2 - OBIETTIVO E PARTECIPANTI', { heading: HeadingLevel.HEADING_1, sb: 360, sa: 200 }),
        mkPara('Obiettivo:', { bold: true, sb: 200, sa: 80 }),
        mkPara(obj.description || 'Verificare il grado di implementazione del Sistema di Gestione della Qualità secondo la norma UNI EN ISO 9001:2015.', { sa: 200 }),
    ];
    if (participants.length) {
        blocks.push(
            mkPara('Partecipanti:', { bold: true, sb: 200, sa: 80 }),
            mkTable([
                new TableRow({ tableHeader: true, children: [
                    mkCell(mkPara('Funzione',      { bold: true }), { fill: CLR.lightGray, pct: 30 }),
                    mkCell(mkPara('Nome e Cognome',{ bold: true }), { fill: CLR.lightGray, pct: 70 }),
                ]}),
                ...participants.map(pt => new TableRow({ children: [
                    mkCell(mkPara(pt.role || 'N/D'), { pct: 30 }),
                    mkCell(mkPara(pt.name || ''),    { pct: 70 }),
                ]})),
            ]),
            emptyPara()
        );
    }
    return blocks;
}

// --- Sezione 3 Rilievi Pendenti ---
export function buildPendingIssuesSection(pendingIssues = []) {
    const open = (pendingIssues || []).filter(pi => (pi.status || pi.issue_status || 'open') !== 'resolved');
    const heading = mkPara('3 - RILIEVI PENDENTI', { heading: HeadingLevel.HEADING_1, sb: 360, sa: 200 });

    if (!open.length) {
        return [heading, mkPara('Nessun rilievo pendente da audit precedenti.', { italic: true, sa: 300 }), pageBreakP()];
    }

    const S = {
        open:        { label: 'Aperto',      fill: CLR.danger,  text: CLR.dangerTxt  },
        in_progress: { label: 'In corso',    fill: CLR.warning, text: CLR.warningTxt },
        persists:    { label: 'Persistente', fill: CLR.danger,  text: CLR.dangerTxt  },
    };

    return [
        heading,
        mkTable([
            new TableRow({ tableHeader: true, children: [
                mkCell(mkPara('Rif. norma',          { bold: true }), { fill: CLR.lightGray, pct: 12 }),
                mkCell(mkPara('Descrizione rilievo', { bold: true }), { fill: CLR.lightGray, pct: 45 }),
                mkCell(mkPara('Audit sorgente',      { bold: true }), { fill: CLR.lightGray, pct: 27 }),
                mkCell(mkPara('Stato',               { bold: true }), { fill: CLR.lightGray, pct: 16 }),
            ]}),
            ...open.map(pi => {
                const sCfg = S[pi.status || pi.issue_status || 'open'] || S.open;
                const notes = pi.resolutionNotes || pi.follow_up_notes || '';
                const descC = [mkPara(pi.description || pi.nc_description || 'N/D', { sa: notes ? 60 : 0 })];
                if (notes) descC.push(mkPara(`\u21b3 ${notes}`, { italic: true, color: '6B7280', sa: 0 }));
                return new TableRow({ children: [
                    mkCell(mkPara(pi.clause || pi.section_id || '\u2014', { align: AlignmentType.CENTER }), { pct: 12 }),
                    mkCell(descC, { pct: 45 }),
                    mkCell(mkPara(pi.originAuditNumber || pi.nc_number || (pi.source_audit_id ? `ID ${pi.source_audit_id}` : '\u2014'), { align: AlignmentType.CENTER }), { pct: 27 }),
                    mkCell(mkPara(sCfg.label, { bold: true, color: sCfg.text, align: AlignmentType.CENTER }), { fill: sCfg.fill, pct: 16 }),
                ]});
            }),
        ]),
        pageBreakP(),
    ];
}

// --- Checklist (tutte le clausole) ---
function buildClauseTable(questions = [], auditAttachments = [], getViewUrl = null) {
    const COL = [45, 18, 37];
    const headerRow = new TableRow({ tableHeader: true, children: [
        mkCell(mkPara('Attività/processo',                    { bold: true }), { fill: CLR.lightGray, pct: COL[0] }),
        mkCell(mkPara('Valutazione di efficacia',             { bold: true }), { fill: CLR.lightGray, pct: COL[1] }),
        mkCell(mkPara('Dettaglio attività operative auditate',{ bold: true }), { fill: CLR.lightGray, pct: COL[2] }),
    ]});

    if (!questions.length) {
        return mkTable([headerRow, new TableRow({ children: [
            mkCell(mkPara('Nessuna domanda presente.', { italic: true, align: AlignmentType.CENTER }), { span: 3 }),
        ]})]);
    }

    const allRows = [];
    questions.forEach(q => {
        const cfg   = STATUS_CFG[q.status] || STATUS_CFG.NOT_ANSWERED;
        const qRef  = q.clauseRef || '';
        const qTxt  = q.question || q.text || 'Domanda non definita';
        const full  = qRef ? `${qRef} - ${qTxt}` : qTxt;
        const notes = (q.notes && q.notes.trim()) ? q.notes.trim() : '\u2014';

        allRows.push(new TableRow({ children: [
            mkCell(mkPara(full,      { sa: 0 }),  { pct: COL[0], va: VerticalAlign.TOP }),
            mkCell(mkPara(cfg.label, { bold: true, color: cfg.text, align: AlignmentType.CENTER }), { fill: cfg.fill, pct: COL[1] }),
            mkCell(mkPara(notes,     { sa: 0 }),  { pct: COL[2], va: VerticalAlign.TOP }),
        ]}));

        const qId   = q.questionId;
        const qAtts = qId != null ? (auditAttachments || []).filter(a => Number(a.questionId) === Number(qId)) : [];
        if (qAtts.length) {
            const attText = '\uD83D\uDCCE Allegati: ' + qAtts.map(a => {
                const name = a.fileName || a.name || 'File';
                const aId  = a.id || a.attachment_id;
                const url  = (getViewUrl && aId) ? `  [${getViewUrl(aId)}]` : '';
                return name + url;
            }).join('  |  ');
            allRows.push(new TableRow({ children: [
                mkCell(mkPara(attText, { color: CLR.infoTxt, size: 18 }), { span: 3, fill: CLR.attachBg, ml: 150 }),
            ]}));
        }
    });

    return mkTable([headerRow, ...allRows]);
}

export function buildChecklistSection(checklist, auditAttachments = [], getViewUrl = null) {
    if (!checklist || !Object.keys(checklist).length) return [];
    const blocks = [];
    Object.entries(checklist).forEach(([, normData]) => {
        if (!normData || typeof normData !== 'object') return;
        Object.entries(normData)
            .sort(([a], [b]) => parseFloat(a.match(/\d+/)?.[0] ?? 0) - parseFloat(b.match(/\d+/)?.[0] ?? 0))
            .forEach(([clauseKey, clause]) => {
                if (!clause || typeof clause !== 'object') return;
                const num   = clauseKey.match(/\d+/)?.[0] || clauseKey;
                const title = (clause.title || '').replace(/^\d+\.?\s*-?\s*/, '');
                blocks.push(
                    mkPara(`${num} - ${title.toUpperCase()}`, { heading: HeadingLevel.HEADING_2, sb: 400, sa: 200 }),
                    buildClauseTable(clause.questions || [], auditAttachments, getViewUrl),
                    emptyPara()
                );
            });
    });
    return blocks;
}

// --- Tabella sintesi rilievi ---
export function buildRileviSummarySection(checklist) {
    const heading = mkPara('SINTESI RILIEVI', { heading: HeadingLevel.HEADING_2, sb: 360, sa: 200 });
    if (!checklist || !Object.keys(checklist).length) {
        return [heading, mkPara('Checklist non disponibile.', { italic: true })];
    }

    const FILL_MAP = { CONF: CLR.success, NC: CLR.danger, OSS: CLR.warning, OM: CLR.info, 'N.A.': CLR.lightGray };
    const PCT = [40, 12, 12, 12, 12, 12];
    const rows = [
        new TableRow({ tableHeader: true, children:
            ['Elemento / Processo','CONF','NC','OSS','OM','N.A.'].map((h, i) =>
                mkCell(mkPara(h, { bold: true, size: 18, align: AlignmentType.CENTER }), { fill: CLR.lightGray, pct: PCT[i] })
            )
        }),
        new TableRow({ children: [
            mkCell(mkPara('AP - Azioni pendenti da audit precedenti', { size: 18 }), { pct: PCT[0] }),
            mkCell(mkPara('X', { bold: true, align: AlignmentType.CENTER }), { fill: CLR.success, pct: PCT[1] }),
            ...['NC','OSS','OM','N.A.'].map((_, i) => mkCell(mkPara(''), { pct: PCT[i + 2] })),
        ]}),
    ];

    Object.values(checklist).forEach(normData => {
        if (!normData || typeof normData !== 'object') return;
        Object.entries(normData)
            .sort(([a], [b]) => parseFloat(a.match(/\d+/)?.[0] ?? 0) - parseFloat(b.match(/\d+/)?.[0] ?? 0))
            .forEach(([, clause]) => {
                if (!clause?.questions) return;
                clause.questions.forEach(q => {
                    let col = '';
                    if      (q.status === 'C')                       col = 'CONF';
                    else if (q.status === 'NC')                      col = 'NC';
                    else if (q.status === 'OSS')                     col = 'OSS';
                    else if (q.status === 'OM')                      col = 'OM';
                    else if (q.status === 'NA' || q.status === 'NV') col = 'N.A.';
                    const label = [(q.clauseRef || q.id || ''), (q.title || q.text || '').replace(/^\d+\.?\d*\.?\d*\s*-?\s*/, '')].filter(Boolean).join('  ');
                    rows.push(new TableRow({ children: [
                        mkCell(mkPara(label, { size: 18 }), { pct: PCT[0] }),
                        ...['CONF','NC','OSS','OM','N.A.'].map((k, i) =>
                            col === k
                                ? mkCell(mkPara('X', { bold: true, align: AlignmentType.CENTER }), { fill: FILL_MAP[k], pct: PCT[i + 1] })
                                : mkCell(mkPara(''), { pct: PCT[i + 1] })
                        ),
                    ]}));
                });
            });
    });

    return [heading, mkTable(rows), emptyPara()];
}

// --- Sezione Esito ---
export function buildOutcomeSection(audit, metrics) {
    const meta    = audit.metadata    || {};
    const outcome = meta.auditOutcome || {};
    const m       = metrics || calculateMetrics(audit.checklist);
    const PCT6    = Math.floor(100 / 6);
    const heading = mkPara('ESITO AUDIT', { heading: HeadingLevel.HEADING_1, sb: 360, sa: 200, pageBreakBefore: true });

    const counterTable = mkTable([
        new TableRow({ tableHeader: true, children:
            ['NC','OSS','OM','N.A./N.V.','TOT. RISPOSTE','TOT. DOMANDE'].map(h =>
                mkCell(mkPara(h, { bold: true, size: 18, align: AlignmentType.CENTER }), { fill: CLR.lightGray, pct: PCT6 })
            )
        }),
        new TableRow({ children: [
            mkCell(mkPara(String(m.totalNC), { bold: true, align: AlignmentType.CENTER, color: m.totalNC > 0 ? CLR.dangerTxt : undefined }), { fill: m.totalNC > 0 ? CLR.danger : CLR.white, pct: PCT6 }),
            mkCell(mkPara(String(m.totalOSS),            { align: AlignmentType.CENTER }), { pct: PCT6 }),
            mkCell(mkPara(String(m.totalOM),             { align: AlignmentType.CENTER }), { pct: PCT6 }),
            mkCell(mkPara(String(m.totalNA + m.totalNV), { align: AlignmentType.CENTER }), { pct: PCT6 }),
            mkCell(mkPara(String(m.answered),            { align: AlignmentType.CENTER }), { pct: PCT6 }),
            mkCell(mkPara(String(m.total),               { align: AlignmentType.CENTER }), { pct: PCT6 }),
        ]}),
    ]);

    return [
        heading,
        counterTable,
        emptyPara(),
        mkPara('Conclusioni:', { bold: true, sb: 200, sa: 80 }),
        mkPara(outcome.conclusions || 'Nessuna conclusione documentata.', { sa: 300 }),
        ...(outcome.emergingFindings?.summary
            ? [mkPara('Sintesi emergenze:', { bold: true, sb: 200, sa: 80 }),
               mkPara(outcome.emergingFindings.summary, { sa: 300 })]
            : []),
    ];
}