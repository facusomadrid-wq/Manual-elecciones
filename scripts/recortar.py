#!/usr/bin/env python3
"""Recorta del PDF original las figuras que no son texto (modelos oficiales y papeletas)
y las guarda como WebP en contenido/img/.  Uso: python3 scripts/recortar.py"""
import subprocess, tempfile, os
from pathlib import Path
from PIL import Image

PDF = "sindicato-uso-manual-electoral-2022-2026-w.pdf"
SALIDA = Path("contenido/img")
DPI = 240
# id: (página PDF, (x0, y0, x1, y1) en puntos)
FIGURAS = {
    "modelo-8-candidatura-empresa": (56, (58, 62, 421, 280)),
    "modelo-4-candidatura-aapp": (56, (58, 284, 421, 531)),
    "modelo-4-candidatura-aapp-b": (57, (58, 57, 421, 222)),
    "papeleta-delegados-contenido": (67, (60, 405, 360, 534)),
    "papeleta-delegados-modelo": (68, (85, 291, 352, 526)),
    "papeleta-comite-empresa": (70, (78, 244, 297, 513)),
    "papeleta-junta-personal": (71, (138, 243, 280, 514)),
}
SALIDA.mkdir(parents=True, exist_ok=True)
s = DPI / 72
with tempfile.TemporaryDirectory() as tmp:
    for fid, (pg, (x0, y0, x1, y1)) in FIGURAS.items():
        base = os.path.join(tmp, f"p{pg}")
        if not os.path.exists(base + ".png"):
            subprocess.run(["pdftoppm", "-r", str(DPI), "-f", str(pg), "-l", str(pg), "-png", "-singlefile", PDF, base], check=True)
        im = Image.open(base + ".png").convert("RGB")
        im.crop((int(x0 * s), int(y0 * s), int(x1 * s), int(y1 * s))).save(SALIDA / f"{fid}.webp", quality=88, method=6)
        print(fid, (SALIDA / f"{fid}.webp").stat().st_size // 1024, "KB")
