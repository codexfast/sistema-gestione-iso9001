/**
 * Ripara word/document.xml nel template Verbale (attributi non quotati + w:p annidati illegali).
 * Esegui: node scripts/fix-verbale-template-xml.js
 */
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

function repairWordDocumentXmlMalformedAttrs(xml) {
  let s = xml;
  s = s.replace(/(<w:p[^>]*>)<w:p>(?=<w:pPr>)/g, '$1');
  s = s.replace(/xml:space=preserve\b/g, 'xml:space="preserve"');
  s = s.replace(/\bw:before=(\d+)(?=[\s/>])/g, 'w:before="$1"');
  s = s.replace(/\bw:after=(\d+)(?=[\s/>])/g, 'w:after="$1"');
  s = s.replace(/\bw:line=(\d+)(?=[\s/>])/g, 'w:line="$1"');
  s = s.replace(/\bw:lineRule=([A-Za-z0-9]+)(?=[\s/>])/g, 'w:lineRule="$1"');
  s = s.replace(/\bw:val=([0-9A-Fa-f]{6})(?=[\s/>])/g, 'w:val="$1"');
  s = s.replace(/\bw:val=(\d+)(?=[\s/>])/g, 'w:val="$1"');
  return s;
}

const docxPath = path.join(__dirname, '..', 'public', 'templates', 'Verbale_di_riunione_QTAFI_VIS001.docx');
const zip = new PizZip(fs.readFileSync(docxPath));
const docPath = 'word/document.xml';
const original = zip.files[docPath].asText();
const fixed = repairWordDocumentXmlMalformedAttrs(original);
if (fixed === original) {
  console.log('Nessuna modifica necessaria');
  process.exit(0);
}
zip.file(docPath, fixed);
fs.writeFileSync(docxPath, zip.generate({ type: 'nodebuffer' }));
console.log('Aggiornato', docxPath);
