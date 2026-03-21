/**
 * Azzera w:tblInd negativi nel Verbale (header/document/footer).
 * Causa tipica: tabella "spostata" rispetto ai margini; in Word si corregge con "Adatta tabella alla finestra".
 * Esegui dalla cartella app: node scripts/fix-verbale-table-margins.js
 */
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const docxPath = path.join(__dirname, '..', 'public', 'templates', 'Verbale_di_riunione_QTAFI_VIS001.docx');
const re = /<w:tblInd w:w="-\d+" w:type="dxa"\/>/g;
const replacement = '<w:tblInd w:w="0" w:type="dxa"/>';

const zip = new PizZip(fs.readFileSync(docxPath));
let parts = 0;
Object.keys(zip.files).forEach((p) => {
    if (!/^word\/(document|header\d+|footer\d+)\.xml$/.test(p)) return;
    const f = zip.files[p];
    if (!f || f.dir) return;
    const t = f.asText();
    if (!re.test(t)) return;
    re.lastIndex = 0;
    const u = t.replace(re, replacement);
    if (u !== t) {
        zip.file(p, u);
        parts++;
        console.log('Aggiornato', p);
    }
});
if (parts === 0) {
    console.log('Nessun tblInd negativo trovato.');
    process.exit(0);
}
fs.writeFileSync(docxPath, zip.generate({ type: 'nodebuffer' }));
console.log('Salvato', docxPath);
