const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const { DOMParser } = require('@xmldom/xmldom');

function repairWordDocumentXmlMalformedAttrs(xml) {
  let s = xml;
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
const z = new PizZip(fs.readFileSync(docxPath));
let x = z.files['word/document.xml'].asText();
const before = x.includes('w:val=AAAAAA') || x.includes('xml:space=preserve>');
const openP0 = (x.match(/<w:p[\s>]/g) || []).length;
const closeP0 = (x.match(/<\/w:p>/g) || []).length;
console.log('before repair w:p open', openP0, 'close', closeP0, 'delta', openP0 - closeP0);
x = repairWordDocumentXmlMalformedAttrs(x);
const openP = (x.match(/<w:p[\s>]/g) || []).length;
const closeP = (x.match(/<\/w:p>/g) || []).length;
console.log('after repair w:p open', openP, 'close', closeP, 'delta', openP - closeP);
console.log('had obvious unquoted before repair guess:', before);
try {
  const doc = new DOMParser().parseFromString(x, 'text/xml');
  const root = doc.documentElement;
  const bad = root && root.nodeName === 'parsererror';
  console.log('parse parsererror root:', bad);
  if (bad) console.log(root.textContent?.slice(0, 400));
} catch (e) {
  console.log('parse threw:', e.message);
}

// Profondita w:p (paragrafo) senza confondere w:pPr / w:pStyle
let depth = 0;
let maxD = 0;
const re = /<w:p(?=[ \/>])|<\/w:p>/g;
let m;
while ((m = re.exec(x)) !== null) {
  if (m[0] === '</w:p>') depth--;
  else depth++;
  if (depth > maxD) maxD = depth;
}
console.log('w:p stack depth at end (should be 0):', depth, 'max', maxD);

const opens = [];
depth = 0;
re.lastIndex = 0;
while ((m = re.exec(x)) !== null) {
  if (m[0] === '</w:p>') {
    depth--;
    opens.pop();
  } else {
    opens.push(m.index);
    depth++;
  }
}
if (opens.length) {
  console.log('unclosed w:p at indices:', opens.slice(-5));
  for (const idx of opens.slice(-2)) {
    console.log('--- context @', idx, '---');
    console.log(x.substring(idx, idx + 200));
  }
}
