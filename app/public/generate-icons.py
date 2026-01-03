#!/usr/bin/env python3
"""
Generatore Icone PWA - Sistema Gestione ISO 9001:2015

Genera tutte le icone richieste dal manifest.json utilizzando Pillow.
Crea un'icona base con logo QS Studio e la ridimensiona per tutte le risoluzioni.

Requisiti: pip install pillow

Standard: ISO 9001:2015 punto 7.5 (documented information)
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Configurazione colori QS Studio
PRIMARY_COLOR = "#1976d2"  # Blue ISO
BACKGROUND_COLOR = "#ffffff"  # White
TEXT_COLOR = "#ffffff"  # White text

# Dimensioni richieste
SIZES = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512]
MASKABLE_SIZES = [192, 512]

def hex_to_rgb(hex_color):
    """Converte colore hex in RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def create_base_icon(size=512):
    """
    Crea icona base con logo QS Studio stilizzato
    
    Design: Cerchio blu con "Q" bianco (rappresenta Qualità)
    """
    # Crea immagine con sfondo trasparente
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # Disegna cerchio di sfondo (primary color)
    padding = size // 8
    draw.ellipse(
        [padding, padding, size - padding, size - padding],
        fill=hex_to_rgb(PRIMARY_COLOR),
        outline=None
    )
    
    # Disegna lettera "Q" stilizzata (semplificata senza font)
    # Cerchio esterno Q
    q_padding = size // 3.5
    draw.ellipse(
        [q_padding, q_padding, size - q_padding, size - q_padding],
        fill=None,
        outline=hex_to_rgb(TEXT_COLOR),
        width=max(size // 20, 8)
    )
    
    # Buco interno Q
    q_hole_padding = size // 2.5
    draw.ellipse(
        [q_hole_padding, q_hole_padding, size - q_hole_padding, size - q_hole_padding],
        fill=hex_to_rgb(PRIMARY_COLOR),
        outline=None
    )
    
    # Coda Q (linea diagonale in basso a destra)
    tail_start_x = size * 0.65
    tail_start_y = size * 0.65
    tail_end_x = size * 0.78
    tail_end_y = size * 0.78
    draw.line(
        [(tail_start_x, tail_start_y), (tail_end_x, tail_end_y)],
        fill=hex_to_rgb(TEXT_COLOR),
        width=max(size // 20, 8)
    )
    
    return img

def create_maskable_icon(base_img, size):
    """
    Crea icona maskable (safe zone 80% del centro)
    Android può applicare maschere (cerchio, squircle, etc)
    """
    # Crea canvas più grande (125% per safe zone)
    canvas_size = int(size * 1.25)
    canvas = Image.new('RGBA', (canvas_size, canvas_size), hex_to_rgb(BACKGROUND_COLOR) + (255,))
    
    # Ridimensiona icona base
    resized = base_img.resize((size, size), Image.Resampling.LANCZOS)
    
    # Centra icona nel canvas
    offset = (canvas_size - size) // 2
    canvas.paste(resized, (offset, offset), resized)
    
    # Ridimensiona a dimensione target
    return canvas.resize((size, size), Image.Resampling.LANCZOS)

def generate_icons():
    """Genera tutte le icone richieste"""
    # Crea directory icons se non esiste
    icons_dir = os.path.join(os.path.dirname(__file__), 'icons')
    os.makedirs(icons_dir, exist_ok=True)
    
    print("🎨 Generazione icone PWA per SGQ ISO 9001:2015...")
    
    # Crea icona base ad alta risoluzione
    base_icon = create_base_icon(size=512)
    
    # Genera icone standard
    for size in SIZES:
        icon = base_icon.resize((size, size), Image.Resampling.LANCZOS)
        filename = f"icon-{size}x{size}.png"
        filepath = os.path.join(icons_dir, filename)
        icon.save(filepath, 'PNG', optimize=True)
        print(f"  ✅ {filename} ({size}x{size})")
    
    # Genera icone maskable
    for size in MASKABLE_SIZES:
        icon = create_maskable_icon(base_icon, size)
        filename = f"icon-maskable-{size}x{size}.png"
        filepath = os.path.join(icons_dir, filename)
        icon.save(filepath, 'PNG', optimize=True)
        print(f"  ✅ {filename} (maskable)")
    
    # Genera favicon.ico (multi-size)
    favicon_sizes = [(16, 16), (32, 32), (48, 48)]
    favicon_images = [base_icon.resize(size, Image.Resampling.LANCZOS) for size in favicon_sizes]
    favicon_path = os.path.join(icons_dir, '..', 'favicon.ico')
    favicon_images[0].save(
        favicon_path,
        format='ICO',
        sizes=favicon_sizes,
        append_images=favicon_images[1:]
    )
    print(f"  ✅ favicon.ico (multi-size)")
    
    print(f"\n✅ Icone generate in: {icons_dir}")
    print(f"📊 Totale: {len(SIZES)} standard + {len(MASKABLE_SIZES)} maskable + 1 favicon")

if __name__ == '__main__':
    try:
        generate_icons()
    except ImportError:
        print("❌ Errore: Pillow non installato")
        print("Installa con: pip install pillow")
        exit(1)
    except Exception as e:
        print(f"❌ Errore durante generazione icone: {e}")
        exit(1)
