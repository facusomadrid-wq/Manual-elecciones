#!/usr/bin/env python3
"""Verifica que no se ha perdido ni añadido texto respecto al PDF original.

Compara, palabra a palabra (sin tener en cuenta formato ni orden), el texto del PDF
(páginas 10-107: introducción, capítulos y anexo) con el texto de los archivos
Markdown de una carpeta.

Uso:  python3 scripts/verificar.py [carpeta_md] [ruta.pdf]
Salida: porcentaje de cobertura y listado de palabras que faltan / sobran.
"""
import re
import sys
import glob
import collections
import subprocess
from pathlib import Path

CARPETA = sys.argv[1] if len(sys.argv) > 1 else "contenido"
PDF = sys.argv[2] if len(sys.argv) > 2 else "sindicato-uso-manual-electoral-2022-2026-w.pdf"
PRIMERA, ULTIMA = 10, 107  # introducción … anexo (108-111 = notas en blanco)

RUIDO_PDF = {"www.uso.es", "manual", "de", "elecciones", "sindicales"}  # cabecera/pie repetidos


def norm(t):
    t = t.lower()
    t = re.sub(r"[*_`#>\[\]{}|:]+", " ", t)
    toks = []
    for w in t.split():
        w = w.strip(".,;:()\"'“”«»¿?¡!-–—•·●▪")
        if w:
            toks.append(w)
    return toks


def tokens_pdf():
    """Texto del PDF página a página, descartando solo pies/cabeceras (nº de página real,
    www.uso.es y la cabecera lateral invertida)."""
    lineas = []
    for pn in range(PRIMERA, ULTIMA + 1):
        txt = subprocess.run(
            ["pdftotext", "-f", str(pn), "-l", str(pn), PDF, "-"], capture_output=True, text=True, check=True
        ).stdout
        quitado_num = False
        for ln in txt.splitlines():
            s = ln.strip()
            if not s or s == "www.uso.es":
                continue
            if s == str(pn - 2) and not quitado_num:  # nº de página impreso = nº PDF - 2
                quitado_num = True
                continue
            if s in ("Manual de Elecciones Sindicales", "launaM", "ed", "senoiccelE", "selacidniS"):
                continue
            lineas.append(s)
    return collections.Counter(norm(" ".join(lineas)))


def tokens_md():
    out = []
    for f in sorted(glob.glob(f"{CARPETA}/[0-9][0-9].md")):
        txt = Path(f).read_text(encoding="utf-8")
        txt = re.sub(r"<!--.*?-->", " ", txt, flags=re.S)  # comentarios de revisión
        # marcas de recuadro: «::: importante» equivale a la etiqueta «IMPORTANTE:» del PDF
        txt = re.sub(r"^:::\s*(\S.*)$", r"\1", txt, flags=re.M)
        txt = re.sub(r"^:::\s*$", " ", txt, flags=re.M)
        txt = re.sub(r"^# (\d+)\.\s", r"\1 ", txt, flags=re.M)  # nº de capítulo: el PDF también lo tiene
        out.append(txt)
    return collections.Counter(norm(" ".join(out)))


def aplica_erratas(p):
    """Las erratas corregidas a propósito (contenido/_erratas.md) no cuentan como pérdida."""
    f = Path(CARPETA) / "_erratas.md"
    if not f.exists():
        return p
    for mal, bien in re.findall(r"«(.+?)» → «(.+?)»", f.read_text(encoding="utf-8")):
        tm, tb = norm(mal), norm(bien)
        if len(tm) == 1 and tm[0] in p:
            n = p.pop(tm[0])
            for t in tb:
                p[t] += n
    return p


def main():
    p, m = aplica_erratas(tokens_pdf()), tokens_md()
    # el índice del manual NO se reproduce (la web genera el suyo); el cuadro lateral tampoco
    faltan = p - m
    sobran = m - p
    total = sum(p.values())
    perdidas = sum(faltan.values())
    print(f"Palabras en el PDF (p.{PRIMERA}-{ULTIMA}): {total}")
    print(f"Palabras en Markdown:              {sum(m.values())}")
    print(f"Cobertura: {100 * (total - perdidas) / total:.2f}%  | faltan {perdidas} | sobran {sum(sobran.values())}")
    if len(sys.argv) > 3 and sys.argv[3] == "--resumen":
        return
    print("\n--- FALTAN en el Markdown (top 60) ---")
    for w, n in faltan.most_common(60):
        print(f"{n:4d}  {w}")
    print("\n--- SOBRAN en el Markdown (top 40) ---")
    for w, n in sobran.most_common(40):
        print(f"{n:4d}  {w}")


if __name__ == "__main__":
    main()
