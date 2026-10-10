#!/usr/bin/env python3
"""Curación del borrador automático (borrador/*.md) -> contenido/*.md

Aplica, de forma reproducible, las correcciones que no se pueden hacer a máquina:
  * tablas y esquemas que en el PDF son IMÁGENES (se transcriben aquí),
  * formularios y papeletas (figuras recortadas con recortar.py),
  * recuadros «Comentario» incrustados, subtítulos y erratas evidentes.

Cada parche comprueba que el texto original existe: si el borrador cambia, falla en voz alta.
Uso: python3 scripts/curar.py
"""
import re
import sys
from pathlib import Path

ORIGEN = Path("borrador")
DESTINO = Path("contenido")
DESTINO.mkdir(exist_ok=True)

docs = {p.stem: p.read_text(encoding="utf-8") for p in sorted(ORIGEN.glob("[0-9][0-9].md"))}
errores = []
erratas_log = []


def rep(cap, viejo, nuevo, veces=1):
    t = docs[cap]
    n = t.count(viejo)
    if n != veces:
        errores.append(f"[{cap}] se esperaban {veces} coincidencias y hay {n}: {viejo[:70]!r}")
        return
    docs[cap] = t.replace(viejo, nuevo)


def rep_re(cap, patron, nuevo, flags=0, veces=1):
    t = docs[cap]
    n = len(re.findall(patron, t, flags))
    if n != veces:
        errores.append(f"[{cap}] regex {patron[:60]!r}: se esperaban {veces}, hay {n}")
        return
    docs[cap] = re.sub(patron, nuevo, t, flags=flags)


def cierra_callout(cap):
    docs[cap] = docs[cap].rstrip() + "\n\n:::\n"


TRANSCRITO = "<!-- transcrito de imagen del manual impreso -->"

# ---------------------------------------------------------------- generales
for k in list(docs):
    t = docs[k]
    # subtítulos tipo «a) Sectores privados…» / «b) Personal funcionario…»
    t = re.sub(r"^\[\[([a-z]\)\s[^\]\n]+)\]\]$", r"#### \1", t, flags=re.M)
    t = re.sub(
        r"^([a-z]\)\s(?:Sectores privados y personal laboral[^\n]*|Personal funcionario y estatutario))$",
        r"#### \1",
        t,
        flags=re.M,
    )
    t = re.sub(r"^### [•·]\s*", "### ", t, flags=re.M)
    docs[k] = t

# ------------------------------------------------------------------ cap. 1
rep("01", "- La Ley 7/2007 (EBEP) derogó", "\\* La Ley 7/2007 (EBEP) derogó")

# ------------------------------------------------------------------ cap. 2 y 8: asteriscos sueltos
rep("02", "legislativas.\n- Previo acuerdo", "legislativas.* Previo acuerdo")
rep("08", "- **Para planificar", "- Para planificar")

# ------------------------------------------------------------------ cap. 3
tabla_del = f"""
{TRANSCRITO}

| Número de personas trabajadoras | Miembros a elegir |
|---|---|
| De 6 a 30 personas trabajadoras | 1 delegado o delegada de personal |
| De 31 a 49 personas trabajadoras | 3 delegados o delegadas de personal |
"""
rep("03", "en la cuantía siguiente:\n", "en la cuantía siguiente:\n" + tabla_del)
tabla_comite = f"""
{TRANSCRITO}

| Número de personas trabajadoras | Miembros a elegir |
|---|---|
| De 50 a 100 personas trabajadoras | 5 miembros de comité de empresa |
| De 101 a 250 personas trabajadoras | 9 miembros de comité de empresa |
| De 251 a 500 personas trabajadoras | 13 miembros de comité de empresa |
| De 501 a 750 personas trabajadoras | 17 miembros de comité de empresa |
| De 751 a 1.000 personas trabajadoras | 21 miembros de comité de empresa |

**A partir de 1.001 personas trabajadoras, 2 miembros más por cada 1.000 o fracción, con un máximo de 75 miembros de comité de empresa.**
"""
rep("03", "de acuerdo con la siguiente escala:\n", "de acuerdo con la siguiente escala:\n" + tabla_comite)
tabla_junta = f"""
{TRANSCRITO}

| Número de personas funcionarias | Miembros a elegir |
|---|---|
| De 50 a 100 personas funcionarias | 5 miembros de junta de personal |
| De 101 a 250 personas funcionarias | 9 miembros de junta de personal |
| De 251 a 500 personas funcionarias | 13 miembros de junta de personal |
| De 501 a 750 personas funcionarias | 17 miembros de junta de personal |
| De 751 a 1.000 personas funcionarias | 21 miembros de junta de personal |

**A partir de 1.001 funcionarios y funcionarias, 2 miembros más por cada 1.000 o fracción, con un máximo de 75 miembros de junta de personal.**
"""
rep("03", "en coherencia con lo establecido en el Estatuto de los Trabajadores:\n",
    "en coherencia con lo establecido en el Estatuto de los Trabajadores:\n" + tabla_junta)
rep_re("03", r"^Comentario\.- (Es importante exigir.*)$", r"::: comentario\n\1\n\n:::", flags=re.M)

# ------------------------------------------------------------------ cap. 4
rep_re("04", r"^\*\*Comentario\.-\*\* (Hay que prestar.*)$", r"::: comentario\n\1\n\n:::", flags=re.M)

# ------------------------------------------------------------------ cap. 5
rep("05", "**Importante:**\n\n**Datos básicos a solicitar:**", "::: importante\n**Datos básicos a solicitar:**")
cierra_callout("05")

# ------------------------------------------------------------------ cap. 6
rep_re("06", r"^\*\*Comentario\.-\*\* (A fin de evitar.*)$", r"::: comentario\n\1\n\n:::", flags=re.M)

# ------------------------------------------------------------------ cap. 8: tabla del ejemplo 8.1
t = docs["08"]
ini = t.index("::: ejemplo")
fin = t.index("::: importante", ini)
docs["08"] = t[:ini] + f"""::: ejemplo
{TRANSCRITO}

| Vencimiento mandato electoral | Primer día hábil para presentar el preaviso | Primer día en que es posible iniciar el proceso electoral | Último día en que es posible iniciar el proceso | Fecha de la votación |
|---|---|---|---|---|
| 20-12-2025 | 20-9-2025 | 20-10-2025 | 20-12-2025 | La que marque la mesa electoral\\* |

*NOTA: El preaviso se podrá presentar también cualquier día posterior al indicado, transcurriendo siempre el mínimo de 1 mes a partir de ese día para la constitución de la mesa electoral (inicio del proceso) y un máximo de 3 meses.*

\\* Nunca podrá ser antes del vencimiento electoral.

:::

""" + t[fin:]

# ------------------------------------------------------------------ cap. 13: modelos oficiales
t = docs["13"]
ini = t.index("**ELECCIONES A REPRESENTANTES DE LOS TRABAJADORES EN LA EMPRESA**")
fin = t.index("## 13.4.")
bloque = t[ini:fin]
bloque = bloque.replace("\n:::\n", "\n")  # el cierre de recuadro estaba en mitad del formulario
nota = "**Nota:** Se rellenarán y adjuntarán, tantas páginas modelo como sean necesarias."
assert nota in bloque
texto_modelos = bloque.replace(nota, "").strip()
docs["13"] = (
    t[:ini].rstrip()
    + "\n\n:::\n\n"
    + """![Modelo 8 — Presentación de candidaturas: elecciones a representantes de los trabajadores en la empresa (ejemplo cumplimentado)](img/modelo-8-candidatura-empresa.webp "Modelo 8 · Elecciones a representantes de los trabajadores en la empresa")

![Modelo 4 — Presentación de candidatura: elecciones a órganos de representación del personal de las Administraciones Públicas (ejemplo cumplimentado)](img/modelo-4-candidatura-aapp.webp "Modelo 4 · Elecciones a órganos de representación del personal de las Administraciones Públicas")

![Modelo 4 (continuación) — relación de candidatos con número de registro y firma de aceptación](img/modelo-4-candidatura-aapp-b.webp "Modelo 4 · continuación")

<details class="texto-modelo"><summary>Ver el texto de los modelos (versión accesible)</summary>

"""
    + texto_modelos
    + "\n\n</details>\n\n"
    + nota
    + "\n\n"
    + t[fin:]
)

# ------------------------------------------------------------------ cap. 15
rep("15", "Por el Apartado A 100 Por el Apartado B 40 Por el Apartado C = 24.000 días trabajados = 120\n\n200 días {{TOTAL PLANTILLA 260}}",
    f"""{TRANSCRITO}

| Apartado | Cálculo | Personas |
|---|---|---:|
| Por el Apartado A | | 100 |
| Por el Apartado B | | 40 |
| Por el Apartado C | 24.000 días trabajados ÷ 200 días | 120 |
| **TOTAL PLANTILLA** | | **260** |""")

rep("15", "a.- 100 b.- 40 c.- 200 con un conjunto de 24.000 días trabajados", "- a.- 100\n- b.- 40\n- c.- 200 con un conjunto de 24.000 días trabajados")

# ------------------------------------------------------------------ cap. 16: papeletas
rep("16", "{{[[DETERMINACIÓN DE PUESTOS]]}}\n\n", "")
t = docs["16"]
ini = t.index("### ELECCIONES SINDICALES")
fin = t.index("### MODELO DE PAPELETA DE VOTO PARA DELEGADOS Y DELEGADAS DE PERSONAL")
docs["16"] = t[:ini] + """![Papeleta de votación para elecciones a delegados y delegadas de personal (contenido)](img/papeleta-delegados-contenido.webp "Contenido de una papeleta de votación — delegados y delegadas de personal")

<details class="texto-modelo"><summary>Ver el texto de la papeleta</summary>

**ELECCIONES SINDICALES** — Empresa: ......................... · Candidatos a elegir: 3

| Candidatos | Siglas | Votos |
|---|---|---|
| AMAT JUSTO, LUISA | (U.S.O.) | ............ |
| BARTOLOMÉ MAS, MATÍAS | (U.S.O.) | ............ |
| IZQUIERDO GARCÍA, ROSA | (U.S.O.) | ............ |
| RUIZ MALO, JOSE LUIS | (CC.OO.) | ............ |
| SORIA BURGOS, JUAN | (U.G.T.) | ............ |
| TACHIN ROLA, ENCARNA | (CC.OO.) | ............ |

</details>

""" + t[fin:]
t = docs["16"]
ini = t.index("**ELECCIONES A ÓRGANOS DE**")
fin = t.index("## 16.2.")
bloque = t[ini:fin].strip()
docs["16"] = t[:ini] + """![Modelo de papeleta de voto para delegados y delegadas de personal en las Administraciones Públicas](img/papeleta-delegados-modelo.webp "Modelo de papeleta — delegados de personal (Administraciones Públicas)")

<details class="texto-modelo"><summary>Ver el texto de la papeleta</summary>

""" + bloque + "\n\n</details>\n\n" + t[fin:]
rep("16", "::: ejemplo\n**Junta de Personal**",
    """![Ejemplo de papeleta de voto para comité de empresa](img/papeleta-comite-empresa.webp "Ejemplo de papeleta — comité de empresa")

::: ejemplo
**Junta de Personal**""")
docs["16"] = docs["16"].rstrip() + """

![Ejemplo de papeleta de voto para miembros de junta de personal](img/papeleta-junta-personal.webp "Ejemplo de papeleta — junta de personal")
"""

# ------------------------------------------------------------------ cap. 18: voto por correo (imagen)
pasos = f"""{TRANSCRITO}

::: pasos
1. La solicitud y el envío se debe hacer a través de las oficinas de Correos.
2. Sobre abierto, enseñando DNI, solicitud sellada por el personal de Correos y carta certificada.
3. La mesa electoral comprueba que la persona trabajadora está en el censo electoral y le remite las papeletas electorales junto con el sobre en el que debe introducir el voto.
4. La persona trabajadora pondrá su papeleta de voto en el sobre que ha enviado la mesa y ese sobre cerrado, lo meterá en un sobre más grande con una fotocopia del DNI. Finalmente, enviará la carta por correo certificado urgente desde cualquier oficina de Correos.
5. El secretario o secretaria de la mesa custodiará el voto por correo, que se lo entregará al presidente o presidenta una vez se cierre el plazo para votar de forma presencial.
6. La mesa comprobará que la persona electora realizó la solicitud de voto por correo, comprueba que está en el censo e introduce su voto en la urna.
:::

{TRANSCRITO}

::: nota
Si la persona electora que haya solicitado el voto por correo se encontrase presente el día de la votación y votase presencialmente, lo manifestará ante la mesa. Su voto por correo, si ha llegado, se destruirá.

Los votos por correo que no hayan llegado en el momento de cierre de votaciones, no se computarán y los mismos deben ser destruidos sin abrir el sobre.

:::
"""
rep("18", "# 18. VOTO POR CORREO\n\n", "# 18. VOTO POR CORREO\n\n" + pasos + "\n")

# ------------------------------------------------------------------ cap. 19
rep("19", "Comentario: A la hora de las votaciones", "::: comentario\nA la hora de las votaciones")
cierra_callout("19")

# ------------------------------------------------------------------ cap. 20: tabla del ejemplo 20.3
t = docs["20"]
ini = t.index("**LISTA CANDIDATOS VOTOS OBTENIDOS SERÁN ELEGIDOS**")
fin = t.index(":::", ini)
docs["20"] = t[:ini] + """| Lista de candidatos | Votos obtenidos | Serán elegidos |
|---|---:|:---:|
| ARTILLA RUIZ, CONSUELO (U.S.O.) | 31 | X |
| JIMÉNEZ ROL, LUIS (CC.OO.) | 27 | X |
| MARTÍNEZ SÁNCHEZ, SOLEDAD (U.S.O.) | 24 | |
| RAMOS TIRADO, JUAN EMILIO (U.G.T.) | 11 | |
| RODRÍGUEZ CAMPO, ÚRSULA (U.S.O.) | 29 | X |
| TORRICO MÍNGUEZ, ENCARNA (CC.OO.) | 6 | |

""" + t[fin:]

# ------------------------------------------------------------------ cap. 21
rep("21", "Comentario: La confección", "::: comentario\nLa confección")
rep("21", "## 21.3.", ":::\n\n## 21.3.")

# ------------------------------------------------------------------ cap. 25
rep("25", "- Hasta 200.000 personas trabajadoras: 2 árbitros.\n\n  - Más de 200.000", "- Hasta 200.000 personas trabajadoras: 2 árbitros.\n\n- Más de 200.000")
rep("25", "\n\n  - Más de 600.000", "\n\n- Más de 600.000")

# ------------------------------------------------------------------ erratas evidentes
ERRATAS = [
    ("clectoral", "electoral"), ("sitación", "situación"), ("personsa", "personas"),
    ("tranajadoras", "trabajadoras"), ("candaidtas", "candidatas"), ("intiuitiva", "intuitiva"),
    ("alcande", "alcance"), ("funcinarias", "funcionarias"), ("funcionariosy", "funcionarios y"),
    ("Ttabajo", "Trabajo"), ("EEmpresa", "Empresa"), ("econtrarás", "encontrarás"),
    ("PEROSNAS", "PERSONAS"), ("s¡ndicato", "sindicato"), ("Sinidical", "Sindical"),
    ("Conferal", "Confederal"), ("fundionario", "funcionario"), ("estaturario", "estatutario"),
    ("nomativa", "normativa"), ("PROMOCION", "PROMOCIÓN"),
]
for k in docs:
    for mal, bien in ERRATAS:
        n = docs[k].count(mal)
        if n:
            docs[k] = docs[k].replace(mal, bien)
            erratas_log.append(f"- Cap. {k}: «{mal}» → «{bien}» ({n})")

if errores:
    print("PARCHES QUE NO ENCAJAN:\n" + "\n".join(errores))
    sys.exit(1)

for k, t in docs.items():
    (DESTINO / f"{k}.md").write_text(t.rstrip() + "\n", encoding="utf-8")
(DESTINO / "_erratas.md").write_text(
    "# Erratas corregidas respecto al PDF original\n\nSolo se corrigen faltas de ortografía evidentes; el contenido jurídico no se toca.\n\n"
    + "\n".join(erratas_log) + "\n",
    encoding="utf-8",
)
print("OK:", len(docs), "capítulos;", len(erratas_log), "erratas")
