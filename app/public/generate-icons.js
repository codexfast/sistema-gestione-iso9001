/**
 * Generatore Icone PWA - Sistema Gestione ISO 9001:2015
 * 
 * Genera icone placeholder SVG per PWA manifest.
 * Per icone professionali, sostituire con grafica custom.
 * 
 * Standard: ISO 9001:2015 punto 7.5 (documented information)
 * 
 * USO: node generate-icons.js
 */

const fs = require('fs');
const path = require('path');

const SIZES = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_SIZES = [192, 512];
const PRIMARY_COLOR = '#1976d2';
const TEXT_COLOR = '#ffffff';

/**
 * Genera SVG con logo QS Studio stilizzato
 */
function generateSVG(size, isMaskable = false) {
  const viewBox = isMaskable ? size * 1.25 : size;
  const offset = isMaskable ? (viewBox - size) / 2 : 0;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${viewBox} ${viewBox}" xmlns="http://www.w3.org/2000/svg">
  ${isMaskable ? `<rect width="${viewBox}" height="${viewBox}" fill="${PRIMARY_COLOR}"/>` : ''}
  <g transform="translate(${offset}, ${offset})">
    <!-- Cerchio sfondo -->
    <circle cx="${size/2}" cy="${size/2}" r="${size/2 - size/8}" fill="${PRIMARY_COLOR}"/>
    
    <!-- Lettera Q stilizzata -->
    <g>
      <!-- Cerchio esterno Q -->
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - size/3.5}" 
              fill="none" stroke="${TEXT_COLOR}" stroke-width="${size/20}"/>
      
      <!-- Buco interno Q -->
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - size/2.5}" fill="${PRIMARY_COLOR}"/>
      
      <!-- Coda Q -->
      <line x1="${size * 0.65}" y1="${size * 0.65}" 
            x2="${size * 0.78}" y2="${size * 0.78}" 
            stroke="${TEXT_COLOR}" stroke-width="${size/20}" stroke-linecap="round"/>
    </g>
    
    <!-- Testo SGQ (opzionale per icone grandi) -->
    ${size >= 192 ? `
    <text x="${size/2}" y="${size - size/6}" 
          text-anchor="middle" 
          fill="${TEXT_COLOR}" 
          font-family="Arial, sans-serif" 
          font-size="${size/12}" 
          font-weight="bold">SGQ</text>
    ` : ''}
  </g>
</svg>`;
}

/**
 * Salva SVG su file
 */
function saveSVG(size, isMaskable = false) {
  const iconsDir = path.join(__dirname, 'icons');
  
  // Crea directory se non esiste
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
  
  const filename = isMaskable 
    ? `icon-maskable-${size}x${size}.svg`
    : `icon-${size}x${size}.svg`;
  
  const filepath = path.join(iconsDir, filename);
  const svgContent = generateSVG(size, isMaskable);
  
  fs.writeFileSync(filepath, svgContent, 'utf8');
  
  return filename;
}

/**
 * Crea favicon.svg (moderna alternativa a .ico)
 */
function createFavicon() {
  const faviconPath = path.join(__dirname, 'favicon.svg');
  const svg = generateSVG(32, false);
  fs.writeFileSync(faviconPath, svg, 'utf8');
  return 'favicon.svg';
}

/**
 * Crea README per icone
 */
function createIconsReadme() {
  const readme = `# Icone PWA - Sistema Gestione ISO 9001:2015

## Generazione

Icone SVG generate automaticamente da \`generate-icons.js\`.

## Conversione SVG → PNG (opzionale)

Per convertire SVG in PNG di alta qualità:

\`\`\`bash
# Con ImageMagick
for file in icons/*.svg; do
  convert -background none -density 300 "$file" "\${file%.svg}.png"
done

# Con Inkscape
for file in icons/*.svg; do
  inkscape "$file" --export-filename="\${file%.svg}.png" --export-dpi=300
done
\`\`\`

## Icone Custom

Per sostituire con icone professionali:
1. Creare PNG ad alta risoluzione (almeno 512x512)
2. Usare tool come [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator)
3. Sovrascrivere file in questa directory

## File Generati

- \`icon-{size}x{size}.svg\` - Icone standard (${SIZES.join(', ')}px)
- \`icon-maskable-{size}x{size}.svg\` - Icone maskable per Android (${MASKABLE_SIZES.join(', ')}px)
- \`../favicon.svg\` - Favicon moderna (scalabile)

## Note Android

Icone **maskable** hanno safe zone 80% per compatibilità con maschere Android (cerchio, squircle, etc).
`;

  const readmePath = path.join(__dirname, 'icons', 'README.md');
  fs.writeFileSync(readmePath, readme, 'utf8');
}

/**
 * Main
 */
function main() {
  console.log('🎨 Generazione icone PWA per SGQ ISO 9001:2015...\n');
  
  let count = 0;
  
  // Genera icone standard
  for (const size of SIZES) {
    const filename = saveSVG(size, false);
    console.log(`  ✅ ${filename} (${size}x${size})`);
    count++;
  }
  
  // Genera icone maskable
  for (const size of MASKABLE_SIZES) {
    const filename = saveSVG(size, true);
    console.log(`  ✅ ${filename} (maskable)`);
    count++;
  }
  
  // Genera favicon
  const faviconName = createFavicon();
  console.log(`  ✅ ${faviconName} (favicon moderna)`);
  count++;
  
  // Crea README
  createIconsReadme();
  console.log(`  ✅ icons/README.md`);
  
  console.log(`\n✅ Icone generate: ${count} file`);
  console.log(`📁 Directory: ${path.join(__dirname, 'icons')}`);
  console.log('\n⚠️  NOTA: File SVG generati. Per PNG converti con ImageMagick/Inkscape.');
  console.log('   Oppure sostituisci con icone professionali custom.\n');
}

if (require.main === module) {
  main();
}

module.exports = { generateSVG, saveSVG };
