/**
 * Diagnostica: elenca .docx in public/templates con possibile mojibake UTF-8/CP1252.
 * Uso: node scripts/scan-template-mojibake.cjs
 */
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const templatesDir = path.join(__dirname, '../public/templates');
const SKIP_XML = /\/(theme|settings|webSettings|fontTable|numbering|styles|glossary)/i;

const MOJIBAKE_W_RUN_BRIDGE =
    '(?:</w:t></w:r>(?:<w:proofErr[^>]*/>)*<w:r(?:\\s[^>]*)?>(?:<w:rPr>[\\s\\S]*?</w:rPr>)?<w:t(?:\\s[^>]*)?>)?';
function wouldFixChange(xml) {
    if (!xml) return false;
    const bridge = MOJIBAKE_W_RUN_BRIDGE;
    let s = xml;
    const before = s;
    s = s.replace(new RegExp(`\\u00E2${bridge}\\u20AC\\u201C`, 'g'), '\u2013');
    s = s.replace(new RegExp(`\\u00E2${bridge}\\u20AC\\u201D`, 'g'), '\u2014');
    s = s.replace(new RegExp(`\\u00E2${bridge}\\u20AC\\u2122`, 'g'), '\u2019');
    s = s.replace(/\u00E2\u20AC\u0153/g, '\u201C');
    s = s.replace(/\u00E2\u20AC\u009D/g, '\u201D');
    return s !== before;
}

const docxFiles = fs.readdirSync(templatesDir).filter((n) => n.endsWith('.docx') && !n.endsWith('.bak'));

for (const name of docxFiles) {
    const fp = path.join(templatesDir, name);
    const z = new PizZip(fs.readFileSync(fp));
    const acircParts = [];
    const fixParts = [];
    for (const p of Object.keys(z.files)) {
        if (!p.startsWith('word/') || !p.endsWith('.xml')) continue;
        if (SKIP_XML.test(p)) continue;
        const f = z.files[p];
        if (!f || f.dir) continue;
        const t = f.asText();
        const nAcirc = (t.match(/\u00e2/g) || []).length;
        if (nAcirc) acircParts.push(`${p}:${nAcirc}`);
        if (wouldFixChange(t)) fixParts.push(p);
    }
    if (fixParts.length) {
        console.log('[DA FIXARE]', name, '→', fixParts.join(', '));
    } else if (acircParts.length) {
        console.log('[â presente, fix non copre]', name, acircParts.join(', '));
    } else {
        console.log('[OK]', name);
    }
}
