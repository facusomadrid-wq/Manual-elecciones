#!/usr/bin/env python3
"""Extrae el texto del PDF del Manual de Elecciones Sindicales y genera un borrador
Markdown por capítulo (carpeta `borrador/`), conservando títulos, negritas, cursivas,
citas legales y recuadros (IMPORTANTE / COMENTARIO / EJEMPLO).

Uso:  python3 scripts/extraer.py [ruta.pdf] [carpeta_salida]

El borrador se revisa después a mano (tablas, modelos, papeletas) y pasa a `contenido/`.
"""
import re
import sys
import json
from pathlib import Path

import pdfplumber

PDF = sys.argv[1] if len(sys.argv) > 1 else "sindicato-uso-manual-electoral-2022-2026-w.pdf"
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "borrador")
OUT.mkdir(parents=True, exist_ok=True)

TITULOS = {
    0: "INTRODUCCIÓN",
    1: "NORMATIVA ELECTORAL SINDICAL",
    2: "CIRCUNSCRIPCIÓN ELECTORAL",
    3: "ÓRGANOS UNITARIOS DE REPRESENTACIÓN",
    4: "SUJETOS CON CAPACIDAD LEGAL PARA PROMOVER ELECCIONES SINDICALES",
    5: "SOLICITUD DE CENSOS A LAS ADMINISTRACIONES PÚBLICAS",
    6: "PROMOCIÓN DE ELECCIONES",
    7: "MANDATO ELECTORAL",
    8: "PREAVISOS DE CELEBRACIÓN DE ELECCIONES",
    9: "EL CENSO ELECTORAL",
    10: "ELECTORES Y ELEGIBLES",
    11: "MESAS ELECTORALES",
    12: "INTERVENTORES",
    13: "CANDIDATURAS ELECTORALES",
    14: "PROPAGANDA ELECTORAL",
    15: "LOS COLEGIOS ELECTORALES",
    16: "PAPELETAS ELECTORALES (DETERMINACIÓN DE PUESTOS)",
    17: "LAS VOTACIONES",
    18: "VOTO POR CORREO",
    19: "LOS VOTOS",
    20: "ESCRUTINIO Y ATRIBUCIÓN DE RESULTADOS",
    21: "LAS ACTAS DE ESCRUTINIO",
    22: "OFICINA PÚBLICA DE REGISTRO",
    23: "SECTORES CON PROCESOS ELECTORALES ESPECIALES",
    24: "SEGUIMIENTO DE LOS RESULTADOS ELECTORALES",
    25: "IMPUGNACIONES Y RECLAMACIONES EN MATERIA ELECTORAL",
    26: "REPRESENTACIÓN INSTITUCIONAL",
    27: "CAMBIOS DE AFILIACIONES E INTEGRACIONES Y FUSIONES",
    28: "ANEXO I.- CALENDARIO DE PLAZOS DE IMPUGNACIONES Y RECLAMACIONES EN MATERIA ELECTORAL",
}
CALLOUT = re.compile(
    r"^(NOTA MUY IMPORTANTE|IMPORTANTE EN LA ADMINISTRACIÓN PÚBLICA|IMPORTANTE|COMENTARIO|EJEMPLO):?\s*$"
)
BULLET = re.compile(r"^([•·●▪\-–]\s+|\(?[a-zA-Z0-9]{1,2}[\).]\s+(?=[A-ZÁÉÍÓÚÑa-z¿(]))")


def is_white(col):
    return col is not None and len(col) >= 1 and all(abs(c - 1.0) < 0.01 for c in col)


def style_of(w):
    f = w["fontname"].split("+")[-1]
    return f, round(w["size"], 1), is_white(w.get("non_stroking_color"))


def inline(words):
    """Convierte una lista de palabras (una línea) a Markdown con énfasis.
    **negrita**, *cursiva*, [[cita legal / resaltado]], {{texto en rojo}}."""
    out, cur, buf = [], None, []

    def flush():
        nonlocal buf, cur
        if not buf:
            return
        kind, red = cur
        t = " ".join(buf)
        if kind == "ref":
            t = f"[[{t}]]"
        elif kind == "bold":
            t = f"**{t}**"
        elif kind == "italic":
            t = f"*{t}*"
        if red:
            t = "{{" + t + "}}"
        out.append(t)
        buf = []

    for w in words:
        f = w["fontname"].split("+")[-1]
        if "GothamBlack" in f or "GothamUltra" in f:
            k = "ref"
        elif "Italic" in f:
            k = "italic"
        elif "Bold" in f:
            k = "bold"
        else:
            k = None
        key = (k, is_white(w.get("non_stroking_color")))
        if key != cur:
            flush()
            cur = key
        buf.append(w["text"])
    flush()
    s = " ".join(out)
    s = re.sub(r"\*\* \*\*", " ", s)
    return s


def page_lines(page):
    words = page.extract_words(
        extra_attrs=["fontname", "size", "non_stroking_color"], keep_blank_chars=False, use_text_flow=False
    )
    keep = []
    for w in words:
        f, sz, white = style_of(w)
        if w["x0"] > 375 or w["x0"] < 20:  # texto rotado lateral / número de página
            continue
        if sz < 5 and "Semibold" in f:
            continue
        if "Semibold" in f and sz == 8.5:  # nº de página y www.uso.es
            continue
        keep.append(w)
    keep.sort(key=lambda w: (round(w["top"]), w["x0"]))
    lines, cur, ytop = [], [], None
    for w in keep:
        if ytop is None or abs(w["top"] - ytop) <= 2.6:
            cur.append(w)
            ytop = w["top"] if ytop is None else ytop
        else:
            lines.append(cur)
            cur, ytop = [w], w["top"]
    if cur:
        lines.append(cur)
    res = []
    fixed = []
    for ln in lines:
        ln.sort(key=lambda w: w["x0"])
        w0 = ln[0]
        if (w0["size"] > 16 and re.fullmatch(r"\d{1,2}", w0["text"]) and w0["x0"] < 70 and len(ln) > 1):
            fixed.append([w0])
            fixed.append(ln[1:])
        else:
            fixed.append(ln)
    for ln in fixed:
        c = {}
        for w in ln:
            c[style_of(w)] = c.get(style_of(w), 0) + len(w["text"])
        dom = max(c, key=c.get)
        res.append(
            dict(
                words=ln,
                top=min(w["top"] for w in ln),
                bottom=max(w["bottom"] for w in ln),
                x0=ln[0]["x0"],
                style=dom,
                text=" ".join(w["text"] for w in ln),
                md=inline(ln),
            )
        )
    return res


def classify(l):
    f, sz, white = l["style"]
    t = l["text"].strip()
    if f == "OpenSans-Bold" and sz == 16.9 and not white and re.fullmatch(r"\d{1,2}", t):
        return "chapnum"
    if f.startswith("Gotham") and white and sz >= 16:
        return "chaptitle"
    if f == "OpenSans-Bold" and sz == 11.0 and not white:
        return "h2"
    if white and ((f == "OpenSans-Bold" and sz == 11.0) or (f == "GothamBlack" and sz == 11.0)):
        return "h2w" if f == "OpenSans-Bold" else "h3"
    if white and f == "OpenSans-Semibold" and sz == 9.0:
        return "h3"
    if f == "OpenSans-Bold" and sz == 9.0 and not white:
        return "h3"
    if white and f == "GothamBold" and sz == 8.0:
        if CALLOUT.match(t):
            return "callout"
        if t.startswith("•") or t.endswith(":") or (t.isupper() and len(t) > 8):
            return "h4"
        return "body"
    return "body"


def build(pdf):
    chapters = {}  # num -> dict(title, blocks)
    cur = None
    front = []
    for pn in range(10, 108):  # desde la introducción hasta el anexo (108-111: notas en blanco)
        page = pdf.pages[pn - 1]
        lines = page_lines(page)
        i = 0
        prev = None
        while i < len(lines):
            l = lines[i]
            k = classify(l)
            if pn == 10 and l["style"][1] > 30:  # título «INTRODUCCIÓN»
                if cur is None:
                    cur = dict(num=0, title="INTRODUCCIÓN", blocks=[], page=pn)
                    chapters[0] = cur
                i += 1
                continue
            if k == "chapnum":
                num = int(l["text"])
                title = []
                j = i + 1
                while j < len(lines) and classify(lines[j]) == "chaptitle":
                    title.append(lines[j]["text"])
                    j += 1
                # el título puede aparecer antes del número en el orden vertical
                k2 = i - 1
                pre = []
                while k2 >= 0 and classify(lines[k2]) == "chaptitle":
                    pre.insert(0, lines[k2]["text"])
                    k2 -= 1
                cur = dict(num=num, title=" ".join(pre + title), blocks=[], page=pn)
                chapters[num] = cur
                i = j
                continue
            if k == "chaptitle":
                # número ya leído o título sin número (p. ej. ANEXO): ignora si es de un título ya iniciado
                if cur is not None and cur["blocks"] == [] and False:
                    pass
                # se recogen títulos que preceden al número en el orden vertical
                j = i
                tt = []
                while j < len(lines) and classify(lines[j]) in ("chaptitle", "chapnum"):
                    if classify(lines[j]) == "chaptitle":
                        tt.append(lines[j]["text"])
                    j += 1
                has_num = any(classify(x) == "chapnum" for x in lines[i:j])
                if has_num:
                    i += 1
                    continue
                # título sin número: no debería ocurrir salvo ANEXO (se numera 28)
                cur = dict(num=None, title=" ".join(tt), blocks=[], page=pn)
                chapters[f"x{pn}"] = cur
                i = j
                continue
            if cur is None:
                i += 1
                continue
            if k in ("h2", "h2w", "h3", "h4"):
                txt = [l["text"]]
                j = i + 1
                while j < len(lines) and classify(lines[j]) == k and lines[j]["top"] - lines[j - 1]["bottom"] < 6:
                    txt.append(lines[j]["text"])
                    j += 1
                cur["blocks"].append(dict(t=k, text=" ".join(txt), pn=pn))
                i = j
                continue
            if k == "callout":
                cur["blocks"].append(dict(t="callout", text=l["text"].rstrip(":").strip(), pn=pn))
                i += 1
                continue
            # cuerpo
            cur["blocks"].append(
                dict(
                    t="line",
                    md=l["md"],
                    text=l["text"],
                    x0=l["x0"],
                    top=l["top"],
                    bottom=l["bottom"],
                    style=list(l["style"]),
                    pn=pn,
                )
            )
            i += 1
    return chapters


def paragraphs(blocks):
    """Agrupa líneas de cuerpo en párrafos (por separación vertical y viñetas)."""
    out = []
    para = None
    last = None
    for b in blocks:
        if b["t"] != "line":
            if para:
                out.append(para)
                para = None
            out.append(b)
            last = None
            continue
        t = b["text"].strip()
        newp = False
        if para is None or last is None:
            newp = True
        else:
            gap = b["top"] - last["bottom"]
            same_page = b["pn"] == last["pn"]
            if same_page and gap > 3.2:
                newp = True
            if same_page and BULLET.match(t) and (t[0] in "•·●▪-–"):
                newp = True
            if not same_page:
                prev_end = para["text"].rstrip()[-1:] if para["text"].strip() else ""
                es_item = bool(BULLET.match(t))
                newp = prev_end in ".:;)?!»”" or es_item
            # citas legales (GothamBlack que empiezan por «(») van en su propio párrafo
            es_cita = b["style"][0] == "GothamBlack" and t.startswith("(")
            fue_cita = last["style"][0] == "GothamBlack" and last["text"].strip().startswith("(")
            if es_cita and not fue_cita:
                newp = True
            if fue_cita and not es_cita:
                newp = True
            if same_page and abs(b["x0"] - last["x0"]) > 12 and last["x0"] < b["x0"] and BULLET.match(last["text"].strip()) is None:
                # sangría nueva sin viñeta: nuevo párrafo
                newp = True
        if newp:
            if para:
                out.append(para)
            hueco = (b["top"] - last["bottom"]) if (last is not None and b["pn"] == last["pn"]) else 0
            para = dict(t="para", md=b["md"], text=b["text"], x0=b["x0"], pn=b["pn"], style=b["style"], gap=hueco)
        else:
            para["md"] += " " + b["md"]
            para["text"] += " " + b["text"]
        last = b
    if para:
        out.append(para)
    return out


def limpia(md):
    md = re.sub(r"\*\*[•·●▪]\*\*", "•", md)               # viñeta en negrita sin texto
    md = re.sub(r"(?<=[\s:.])\*(?!\*)\s+(?=\S)", "\n- ", md)   # « * » incrustado = viñeta
    md = re.sub(r"\}\}\s+\{\{", " ", md)            # rojos contiguos
    md = re.sub(r"\*\*\s+\*\*", " ", md)          # negritas contiguas
    md = re.sub(r"\*([,.;:])\*", r"\1", md)          # cursivas que solo contienen puntuación
    md = re.sub(r"\*\s+\*", " ", md)
    md = re.sub(r"^((?:\{\{)?(?:\*\*)?)[•·●▪]\s*", r"\1", md)  # viñeta dentro del énfasis
    return md


def render(ch):
    ps = paragraphs(ch["blocks"])
    md = []
    n = ch["num"]
    head = f"# {n}. {ch['title']}" if isinstance(n, int) and n > 0 else f"# {ch['title']}"
    md.append(head)
    md.append("")
    in_callout = None
    ultimo = ""
    prev_item = False
    for p in ps:
        t = p["t"]
        if t != "para":
            prev_item = False
        if t in ("h2", "h2w"):
            if in_callout:
                md.append(":::\n")
                in_callout = None
            md.append(("### " if t == "h2w" else "## ") + f"{p['text']}\n")
        elif t in ("h3", "h4"):
            if in_callout:
                md.append(":::\n")
                in_callout = None
            md.append(f"### {p['text']}\n")
        elif t == "callout":
            if in_callout:
                md.append(":::\n")
            in_callout = p["text"]
            md.append(f"::: {p['text'].lower()}")
        else:
            if in_callout and p.get("gap", 0) > 12 and not ultimo.endswith(":"):
                md.append(":::\n")
                in_callout = None
            ultimo = p["text"].strip()
            txt = limpia(p["md"])
            s = p["text"].strip()
            if p["style"][0] == "GothamBlack" and s.startswith("("):
                txt = "[[" + s + "]]"
                if in_callout:
                    md.append(txt + "\n")
                    md.append(":::\n")
                    in_callout = None
                    continue
            if re.match(r"^[-–]\s+\S", s):  # guion = subnivel solo si sigue a otra viñeta
                sangria = "  " if prev_item else ""
                txt = sangria + "- " + re.sub(r"^(\*\*)?[-–]\s+", r"\1", txt)
            elif re.match(r"^[•·●▪]\s*", s):
                txt = "- " + re.sub(r"^(\*\*)?[•·●▪]\s*[●▪]?\s*", r"\1", txt)
            elif re.match(r"^\*\s", s):  # viñeta con asterisco
                txt = "- " + re.sub(r"^(\*\*)?\*\s+", r"\1", txt)
            md.append(txt + "\n")
            prev_item = txt.lstrip().startswith("- ")
    if in_callout:
        md.append(":::\n")
    return "\n".join(md)


def main():
    pdf = pdfplumber.open(PDF)
    chapters = build(pdf)
    summary = []
    for key, ch in chapters.items():
        num = ch["num"]
        if num is None:
            num = 28
            ch["num"] = 28
        ch["title"] = TITULOS.get(int(num), ch["title"])
        name = f"{int(num):02d}.md"
        (OUT / name).write_text(render(ch), encoding="utf-8")
        summary.append(dict(num=num, title=ch["title"], page=ch["page"], blocks=len(ch["blocks"])))
    (OUT / "_resumen.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1), encoding="utf-8")
    for s in summary:
        print(s)


if __name__ == "__main__":
    main()
