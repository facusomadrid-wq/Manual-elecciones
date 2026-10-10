#!/usr/bin/env python3
"""Genera la web del Manual de Elecciones Sindicales (FAC-USO) a partir de contenido/*.md.

Salida:
  docs/index.html            web completa (GitHub Pages), con docs/assets, docs/img, PWA
  docs/manual-elecciones-facuso.html   versión de UN SOLO ARCHIVO (todo incrustado, funciona sin conexión)

Uso:  python3 scripts/construir.py
"""
import base64
import json
import re
import shutil
import unicodedata
from pathlib import Path

from bs4 import BeautifulSoup
from markdown_it import MarkdownIt
from mdit_py_plugins.container import container_plugin

RAIZ = Path(__file__).resolve().parent.parent
CONT = RAIZ / "contenido"
WEB = RAIZ / "web"
DOCS = RAIZ / "docs"
VERSION = "1.0.0"

# --------------------------------------------------------------------------- utilidades
SIGLAS = {
    "ET", "E.T.", "EBEP", "TREBEP", "T.R.E.B.E.P.", "LOLS", "L.O.L.S.", "LRJS", "R.D.", "RD", "RDL", "USO", "CC.AA.", "CCAA",
    "DNI", "NIE", "RLT", "BOE", "II", "III", "IV", "EBEP.", "CNAE", "CC.OO.", "U.G.T.", "U.S.O.", "I",
}
PROPIOS = {"estado", "madrid", "ceuta", "melilla", "social"}
CALLOUTS = {
    "importante": ("Importante", "⚠️"),
    "comentario": ("Comentario", "💬"),
    "ejemplo": ("Ejemplo", "🧩"),
    "nota": ("Nota", "📌"),
    "pasos": ("Paso a paso", "➡️"),
}


def sin_acentos(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def frase(t):
    """MAYÚSCULAS -> Frase (conserva siglas). Solo si el título está en mayúsculas."""
    letras = [c for c in t if c.isalpha()]
    if not letras or sum(c.isupper() for c in letras) / len(letras) < 0.8:
        return t
    pal = t.split(" ")
    out = []
    primera = True
    prev = ""
    for w in pal:
        base = w.strip("()¿?,.:;-")
        if re.fullmatch(r"[A-Z]\)", w):  # «A)», «B)»: rótulos de apartado (la palabra siguiente va en mayúscula)
            out.append(w)
            continue
        elif base.upper() in SIGLAS or re.fullmatch(r"(?:[A-ZÁÉÍÓÚ]\.){2,}", base) or re.fullmatch(r"[\d.]+\.?-?", base):
            out.append(w)
        else:
            low = w.lower()
            if base.lower() in PROPIOS:
                low = low.replace(base.lower(), base.lower().capitalize())
            out.append(low)
            if prev.endswith(".") and len(prev) > 3 and not re.fullmatch(r"[\d.]+\.?-?", prev) and not re.fullmatch(r"(?:[A-ZÁÉÍÓÚa-z]\.){2,}", prev):
                m2 = re.search(r"[a-záéíóúñ]", out[-1])
                if m2:
                    out[-1] = out[-1][:m2.start()] + out[-1][m2.start()].upper() + out[-1][m2.start() + 1:]
        prev = w
        if primera and re.search(r"[A-Za-zÁÉÍÓÚáéíóú]", w):
            # capitaliza la primera palabra con letras
            m = re.search(r"[A-Za-zÁÉÍÓÚáéíóúñÑ]", out[-1])
            if m:
                i = m.start()
                out[-1] = out[-1][:i] + out[-1][i].upper() + out[-1][i + 1:]
            primera = False
    return " ".join(out)


# --------------------------------------------------------------------------- audiencias
PUB = re.compile(r"(administraci[oó]n(es)? p[uú]blicas?|funcionari|estatutari|juntas? de personal|trebep|ebep|unidades? electorales?|coordinadora|parcial\b|mesa electoral [uú]nica)", re.I)
PRIV = re.compile(r"(sectores? privados?|personal laboral|comit[eé]s? de empresa|^\W*en la empresa|empresas?\b)", re.I)
PUB_PARRAFO = re.compile(r"^\W*(en|para)( las| los)?( elecciones a juntas de personal|\s+administraci[oó]n(es)? p[uú]blicas?|\s+el caso de las administraci[oó]n(es)? p[uú]blicas?)", re.I)


OVERRIDES = {"13.5": None, "17.4": None, "17.5": None}  # apartados mixtos (empresa y Administración)


def aud_de_titulo(t):
    t = t.strip()
    m = re.match(r"^(\d+\.\d+)", t)
    if m and m.group(1) in OVERRIDES:
        return OVERRIDES[m.group(1)]
    if re.search(r"personal laboral|sectores? privados?", t, re.I) and not re.search(r"funcionari|estatutari", t, re.I):
        return "priv"
    pub = bool(PUB.search(t))
    priv = bool(re.search(r"sectores? privados?|comit[eé]s? de empresa|\bempresas?\b", t, re.I))
    if pub and priv:
        return None
    if pub:
        return "pub"
    if priv:
        return "priv"
    return None


# --------------------------------------------------------------------------- markdown
def crear_md():
    md = MarkdownIt("commonmark", {"html": True, "breaks": False}).enable("table")

    def render_cont(nombre):
        def r(self, tokens, idx, options, env):
            tk = tokens[idx]
            if tk.nesting == 1:
                extra = tk.info.strip()[len(nombre):].strip()
                etiqueta, ico = CALLOUTS[nombre]
                if nombre == "nota" and extra:
                    etiqueta = "Nota " + extra
                elif nombre == "importante" and extra:
                    etiqueta = "Importante " + extra
                aud = f' data-aud="{tk.attrGet("data-aud")}"' if tk.attrGet("data-aud") else ""
                if nombre == "pasos":
                    return f'<div class="pasos"{aud}>\n'
                return (f'<aside class="callout callout-{nombre}"{aud}><div class="callout-head">'
                        f'<span class="callout-ico" aria-hidden="true">{ico}</span><span class="callout-title">{etiqueta}</span></div>'
                        f'<div class="callout-body">\n')
            return "</div>\n" if nombre == "pasos" else "</div></aside>\n"
        return r

    for nombre in CALLOUTS:
        container_plugin(md, name=nombre, render=render_cont(nombre))
    return md


def etiquetar_audiencia(tokens):
    """Marca con data-aud los bloques de primer nivel según el apartado en que estén."""
    actual = None
    nivel = 9
    i = 0
    n = len(tokens)
    while i < n:
        tk = tokens[i]
        if tk.level == 0 and tk.type == "heading_open":
            h = int(tk.tag[1])
            texto = tokens[i + 1].content
            a = aud_de_titulo(texto)
            if h <= nivel or a is not None:
                if h <= nivel or a:
                    actual, nivel = a, h
            if a is None and h <= 2:
                actual, nivel = None, h
            if actual:
                tk.attrSet("data-aud", actual)
        elif tk.level == 0 and tk.nesting == 1 and tk.type in ("paragraph_open", "bullet_list_open", "ordered_list_open", "table_open", "container_importante_open",
                                                              "container_comentario_open", "container_ejemplo_open", "container_nota_open"):
            a = actual
            if tk.type == "paragraph_open":
                txt = tokens[i + 1].content
                if PUB_PARRAFO.search(txt):
                    a = "pub"
            if a:
                tk.attrSet("data-aud", a)
        i += 1


# --------------------------------------------------------------------------- posproceso HTML
RE_REF = re.compile(r"^\(\s*(Art|Arts|Artº|Artículo|Artículos|Disposición|Modelo|Sentencia|Resolución|Orden)\b")


def posprocesar(html, capnum):
    html = html.replace("{{", '<span class="rojo">').replace("}}", "</span>")
    html = re.sub(r"\[\[(.+?)\]\]", lambda m: ('<span class="ref">%s</span>' % m.group(1)) if m.group(1).lstrip().startswith("(") else ('<mark class="dest">%s</mark>' % m.group(1)), html, flags=re.S)
    soup = BeautifulSoup(html, "html.parser")

    # encabezados
    for h in soup.find_all(["h1", "h2", "h3", "h4"]):
        txt = h.get_text(" ", strip=True)
        txt = frase(txt)
        h.string = txt
        if h.name == "h2":
            m = re.match(r"^(\d+)\.(\d+)", txt)
            if m:
                h["id"] = f"s-{m.group(1)}-{m.group(2)}"
        if h.name == "h1":
            h["id"] = f"t-{capnum}"

    # citas legales: párrafos formados solo por «( … )»
    for p in soup.find_all("p"):
        t = p.get_text(" ", strip=True)
        if RE_REF.match(t) and t.endswith((")", ").", ")*")) and len(t) < 330:
            p["class"] = p.get("class", []) + ["ref-bloque"]
            for s in p.find_all(["strong", "em"]):
                s.unwrap()
            if not p.find("span", class_="ref"):
                inner = p.decode_contents()
                p.clear()
                span = soup.new_tag("span", attrs={"class": "ref"})
                span.append(BeautifulSoup(inner, "html.parser"))
                p.append(span)

    # tablas adaptables
    for tb in soup.find_all("table"):
        cab = [th.get_text(" ", strip=True) for th in tb.find_all("th")]
        for tr in tb.find_all("tr"):
            for i, td in enumerate(tr.find_all("td")):
                if i < len(cab):
                    td["data-label"] = cab[i]
        if len(cab) >= 4:
            tb["class"] = tb.get("class", []) + ["tabla-tarjetas"]
        wrap = soup.new_tag("div", attrs={"class": "tabla"})
        tb.wrap(wrap)

    # figuras
    for img in soup.find_all("img"):
        fig = soup.new_tag("figure", attrs={"class": "figura"})
        img["loading"] = "lazy"
        img["decoding"] = "async"
        titulo = img.get("title", "")
        if "title" in img.attrs:
            del img["title"]
        btn = soup.new_tag("button", attrs={"class": "zoom", "type": "button", "aria-label": "Ampliar imagen: " + img.get("alt", "")})
        padre = img.parent
        img.wrap(btn)
        btn.wrap(fig)
        if titulo:
            cap = soup.new_tag("figcaption")
            cap.string = titulo
            fig.append(cap)
        if padre is not None and padre.name == "p" and len(padre.contents) == 1:
            padre.unwrap()

    # pasos: lista ordenada dentro de .pasos
    for ol in soup.select(".pasos > ol"):
        ol["class"] = ol.get("class", []) + ["lista-pasos"]

    # comentarios HTML fuera
    from bs4 import Comment
    for c in soup.find_all(string=lambda s: isinstance(s, Comment)):
        c.extract()
    return str(soup)


def texto_plano(html):
    s = BeautifulSoup(html, "html.parser")
    for d in s.select("details"):
        pass
    return re.sub(r"\s+", " ", s.get_text(" ", strip=True))


# --------------------------------------------------------------------------- construcción
def main():
    meta = json.loads((WEB / "datos/capitulos.json").read_text(encoding="utf-8"))
    glos = json.loads((WEB / "datos/glosario.json").read_text(encoding="utf-8"))
    checks = json.loads((WEB / "datos/checklists.json").read_text(encoding="utf-8"))
    md = crear_md()

    capitulos = []
    indice = []
    html_caps = []
    for f in sorted(CONT.glob("[0-9][0-9].md")):
        num = int(f.stem)
        fuente = f.read_text(encoding="utf-8")
        fuente = re.sub(r"^# (\d+)\.\s*", "# ", fuente)  # el nº va en la cabecera propia
        tokens = md.parse(fuente)
        etiquetar_audiencia(tokens)
        html = md.renderer.render(tokens, md.options, {})
        html = posprocesar(html, num)
        soup = BeautifulSoup(html, "html.parser")
        h1 = soup.find("h1")
        titulo = h1.get_text(strip=True)
        h1.extract()
        cuerpo = str(soup)
        # secciones
        sec = []
        for h in BeautifulSoup(cuerpo, "html.parser").find_all("h2"):
            sec.append({"id": h.get("id", ""), "t": h.get_text(strip=True)})
        capitulos.append({"n": num, "titulo": titulo, "secciones": [s for s in sec if s["id"]], **meta["capitulos"][str(num)]})

        # índice de búsqueda por sección (h2) + preámbulo
        partes = re.split(r'(?=<h2 )', cuerpo)
        for k, parte in enumerate(partes):
            ps = BeautifulSoup(parte, "html.parser")
            h2 = ps.find("h2")
            sid = h2.get("id") if h2 else ""
            tit = h2.get_text(" ", strip=True) if h2 else titulo
            txt = texto_plano(parte)
            if len(txt) < 3:
                continue
            indice.append({"c": num, "s": sid or "", "t": tit, "x": txt})
        etiqueta_num = f"{num}" if num else ""
        html_caps.append(
            f'<article class="cap" id="c-{num}" data-cap="{num}" hidden>\n'
            f'<header class="cap-cab"><div class="cap-num" aria-hidden="true">{etiqueta_num or "★"}</div>'
            f'<div><p class="cap-parte" data-parte></p><h1 class="cap-titulo" id="t-{num}" tabindex="-1">{titulo}</h1></div></header>\n'
            f'<div class="cap-cuerpo">\n{cuerpo}\n</div></article>'
        )

    # créditos
    cred = md.render((CONT / "_creditos.md").read_text(encoding="utf-8"))

    datos = {
        "version": VERSION,
        "partes": meta["partes"],
        "capitulos": capitulos,
        "glosario": glos,
        "checklists": checks,
        "indice": indice,
    }

    css = (WEB / "estilos.css").read_text(encoding="utf-8")
    js_app = (WEB / "app.js").read_text(encoding="utf-8")
    js_tools = (WEB / "herramientas.js").read_text(encoding="utf-8")
    js_qr = (WEB / "vendor/qrcode.js").read_text(encoding="utf-8")
    plantilla = (WEB / "plantilla.html").read_text(encoding="utf-8")

    fuentes_css = ""
    for w in (400, 500, 600, 700):
        fuentes_css += "@font-face{font-family:'Poppins';font-style:normal;font-weight:%d;font-display:swap;src:url(%%FONT%d%%) format('woff2')}\n" % (w, w)

    def montar(single):
        css_full = fuentes_css + css
        if single:
            for w in (400, 500, 600, 700):
                b64 = base64.b64encode((WEB / f"fonts/poppins-{w}.woff2").read_bytes()).decode()
                css_full = css_full.replace(f"%FONT{w}%", f"data:font/woff2;base64,{b64}")
        else:
            for w in (400, 500, 600, 700):
                css_full = css_full.replace(f"%FONT{w}%", f"../fonts/poppins-{w}.woff2")
        caps = "\n".join(html_caps)
        if single:
            def inline_img(m):
                ruta = m.group(1)
                p = CONT / ruta
                return 'src="data:image/webp;base64,%s"' % base64.b64encode(p.read_bytes()).decode()
            caps = re.sub(r'src="(img/[^"]+)"', inline_img, caps)
        out = plantilla
        out = out.replace("<!--CSS-->", f"<style>\n{css_full}\n</style>" if single else '<link rel="stylesheet" href="assets/estilos.css">')
        out = out.replace("<!--CAPITULOS-->", caps)
        out = out.replace("<!--CREDITOS-->", cred)
        datos_js = "window.MANUAL=" + json.dumps(datos, ensure_ascii=False, separators=(",", ":")) + ";"
        scripts = ""
        if single:
            scripts = f"<script>{datos_js}</script>\n<script>{js_qr}</script>\n<script>{js_tools}</script>\n<script>{js_app}</script>"
        else:
            scripts = '<script src="assets/datos.js"></script>\n<script src="assets/qrcode.js"></script>\n<script src="assets/herramientas.js"></script>\n<script src="assets/app.js"></script>'
        logo = CONT / "img/logo-uso-ffc.webp"
        if single:
            uri = "data:image/webp;base64," + base64.b64encode(logo.read_bytes()).decode()
        else:
            uri = "img/logo-uso-ffc.webp"
        out = out.replace("<!--LOGO-->", f'<script>window.LOGO="{uri}";</script>')
        out = out.replace("<!--SCRIPTS-->", scripts)
        out = out.replace("%VERSION%", VERSION)
        out = out.replace("<!--PWA-->", "" if single else '<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icons/icono-192.png"><link rel="apple-touch-icon" href="icons/icono-192.png">')
        return out, css_full, datos_js

    # --- versión web (multiarchivo)
    if DOCS.exists():
        shutil.rmtree(DOCS)
    (DOCS / "assets").mkdir(parents=True)
    (DOCS / "img").mkdir()
    (DOCS / "fonts").mkdir()
    (DOCS / "icons").mkdir()
    html_web, css_full, datos_js = montar(False)
    (DOCS / "index.html").write_text(html_web, encoding="utf-8")
    (DOCS / "assets/estilos.css").write_text(css_full, encoding="utf-8")
    (DOCS / "assets/datos.js").write_text(datos_js, encoding="utf-8")
    (DOCS / "assets/app.js").write_text(js_app, encoding="utf-8")
    (DOCS / "assets/herramientas.js").write_text(js_tools, encoding="utf-8")
    (DOCS / "assets/qrcode.js").write_text(js_qr, encoding="utf-8")
    for p in (CONT / "img").glob("*.webp"):
        shutil.copy(p, DOCS / "img" / p.name)
    for p in (WEB / "fonts").glob("*.woff2"):
        shutil.copy(p, DOCS / "fonts" / p.name)
    for p in (WEB / "icons").glob("*.png"):
        shutil.copy(p, DOCS / "icons" / p.name)
    shutil.copy(WEB / "manifest.webmanifest", DOCS / "manifest.webmanifest")
    sw = (WEB / "sw.js").read_text(encoding="utf-8").replace("%VERSION%", VERSION)
    (DOCS / "sw.js").write_text(sw, encoding="utf-8")
    (DOCS / ".nojekyll").write_text("", encoding="utf-8")
    pdf = RAIZ / "sindicato-uso-manual-electoral-2022-2026-w.pdf"
    if pdf.exists():
        shutil.copy(pdf, DOCS / "manual-original.pdf")

    # --- versión de un solo archivo
    html_single, _, _ = montar(True)
    (DOCS / "manual-elecciones-facuso.html").write_text(html_single, encoding="utf-8")

    print(f"Capítulos: {len(capitulos)} · secciones indexadas: {len(indice)}")
    print(f"docs/index.html {len(html_web)//1024} KB · versión 1 archivo {len(html_single)//1024} KB")


if __name__ == "__main__":
    main()
