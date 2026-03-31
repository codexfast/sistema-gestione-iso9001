/**
 * Patch templates ISO9001/ISO45001: aggiunge righe conteggi C e N.A.
 *
 * Problema: i template contenevano solo {ncCount}{ossCount}{omCount}{nvCount} → mancavano C e NA.
 * Fix: clona la riga NV e inserisce due righe (C + N.A.) prima di NV.
 */
const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function extractFirstRowByToken(xml, token) {
  const idx = xml.indexOf(`<w:t>${token}</w:t>`);
  if (idx < 0) return null;
  const trStart = xml.lastIndexOf("<w:tr", idx);
  const trEnd = xml.indexOf("</w:tr>", idx);
  if (trStart < 0 || trEnd < 0) return null;
  return { start: trStart, end: trEnd + "</w:tr>".length, xml: xml.slice(trStart, trEnd + "</w:tr>".length) };
}

function replaceAll(s, pairs) {
  let out = s;
  for (const [a, b] of pairs) out = out.split(a).join(b);
  return out;
}

function cloneCountRow(nvRowXml, { labelText, token }) {
  // 1) sostituisci placeholder nvCount -> token
  // 2) sostituisci la label "Non Valutato (NV)" -> labelText (mantiene formattazione)
  let out = nvRowXml;
  out = replaceAll(out, [["<w:t>nvCount</w:t>", `<w:t>${token}</w:t>`]]);

  // Il testo label sta in un unico <w:t> in questi template.
  // Per robustezza gestiamo anche varianti con xml:space o spezzate.
  if (out.includes("<w:t>Non Valutato (NV)</w:t>")) {
    out = out.replace("<w:t>Non Valutato (NV)</w:t>", `<w:t>${labelText}</w:t>`);
  } else {
    // fallback: sostituisci NV -> token-label mantenendo il resto
    out = out.replace(/Non Valutato\s*\(NV\)/g, labelText);
  }
  return out;
}

function patchDocxTemplate(docxPath) {
  const bin = fs.readFileSync(docxPath);
  const zip = new PizZip(bin);
  const docFile = zip.file("word/document.xml");
  if (!docFile) die(`Template senza word/document.xml: ${docxPath}`);
  const xml = docFile.asText();

  if (xml.includes("<w:t>cCount</w:t>") && xml.includes("<w:t>naCount</w:t>")) {
    console.log(`[OK] già patchato: ${path.basename(docxPath)}`);
    return false;
  }

  const nvRow = extractFirstRowByToken(xml, "nvCount");
  if (!nvRow) die(`Non trovo riga NV (nvCount) in ${docxPath}`);

  // Inserisci due righe prima della riga NV.
  const cRow = cloneCountRow(nvRow.xml, { labelText: "Conforme (C)", token: "cCount" });
  const naRow = cloneCountRow(nvRow.xml, { labelText: "Non Applicabile (N.A.)", token: "naCount" });

  const patched =
    xml.slice(0, nvRow.start) +
    cRow +
    naRow +
    nvRow.xml +
    xml.slice(nvRow.end);

  zip.file("word/document.xml", patched);
  const outBin = zip.generate({ type: "nodebuffer" });
  fs.writeFileSync(docxPath, outBin);
  console.log(`[PATCH] aggiornato: ${path.basename(docxPath)}`);
  return true;
}

function main() {
  const root = path.resolve(__dirname, "..");
  const templatesDir = path.join(root, "public", "templates");
  const targets = [
    path.join(templatesDir, "ISO9001-audit-report.docx"),
    path.join(templatesDir, "ISO45001-audit-report.docx"),
  ];

  let changed = 0;
  for (const p of targets) {
    if (!fs.existsSync(p)) die(`File mancante: ${p}`);
    if (patchDocxTemplate(p)) changed++;
  }

  console.log(`Done. Templates modificati: ${changed}/${targets.length}`);
}

main();

