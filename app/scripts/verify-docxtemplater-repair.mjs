/**
 * Smoke: template ISO9001 + repair tag spezzati + docxtemplater riempie auditObject / clientName / auditor.
 */
import fs from 'fs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { repairDocxtemplaterFragmentedTags } from '../src/utils/wordExport.js';

function allWText(xml) {
    const a = [];
    const re = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let m;
    while ((m = re.exec(xml))) a.push(m[1]);
    return a.join('|');
}

const buf = fs.readFileSync(new URL('../public/templates/ISO9001-audit-report.docx', import.meta.url));
const z = new PizZip(buf);
for (const p of Object.keys(z.files).filter((x) => /^word\/(document|header\d+|footer\d+)\.xml$/.test(x))) {
    z.file(p, repairDocxtemplaterFragmentedTags(z.files[p].asText()));
}

const data = {
    clientName: 'ACME_SPA',
    auditObject: 'OGGETTO_X',
    auditNumber: 'N-99',
    procedureCode: 'PR99',
    auditDate: '01/01/2026',
    scope: '_SCOPE_',
    referenceDocuments: 'REF',
    processes: 'PROC',
    programCommunicatedDate: '-',
    auditor: 'MARIO_ROSSI',
    objectiveDescription: 'OBJ',
    participants: [{ role: 'R', name: 'N' }],
    conclusions: 'OK',
    ncCount: '0',
    ossCount: '0',
    omCount: '0',
    nvCount: '0',
    naCount: '0',
    summaryText: 'S',
};
const d = new Docxtemplater(z, { paragraphLoop: true, linebreaks: true, nullGetter: () => '' });
d.render(data);
const out = d.getZip().files['word/document.xml'].asText();
const h = d.getZip().files['word/header1.xml'].asText();
const docPlain = allWText(out);
const hdrPlain = allWText(h);
const ok =
    docPlain.includes('OGGETTO_X') &&
    docPlain.includes('MARIO_ROSSI') &&
    hdrPlain.includes('ACME_SPA') &&
    hdrPlain.includes('N-99');
console.log(JSON.stringify({ docPlainOk: ok, docPlain, hdrPlain: hdrPlain.slice(0, 200) }));
if (!ok) process.exit(1);
