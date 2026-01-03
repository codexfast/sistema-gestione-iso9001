# Icone PWA - Sistema Gestione ISO 9001:2015

## Generazione

Icone SVG generate automaticamente da `generate-icons.js`.

## Conversione SVG → PNG (opzionale)

Per convertire SVG in PNG di alta qualità:

```bash
# Con ImageMagick
for file in icons/*.svg; do
  convert -background none -density 300 "$file" "${file%.svg}.png"
done

# Con Inkscape
for file in icons/*.svg; do
  inkscape "$file" --export-filename="${file%.svg}.png" --export-dpi=300
done
```

## Icone Custom

Per sostituire con icone professionali:
1. Creare PNG ad alta risoluzione (almeno 512x512)
2. Usare tool come [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator)
3. Sovrascrivere file in questa directory

## File Generati

- `icon-{size}x{size}.svg` - Icone standard (16, 32, 72, 96, 128, 144, 152, 192, 384, 512px)
- `icon-maskable-{size}x{size}.svg` - Icone maskable per Android (192, 512px)
- `../favicon.svg` - Favicon moderna (scalabile)

## Note Android

Icone **maskable** hanno safe zone 80% per compatibilità con maschere Android (cerchio, squircle, etc).
