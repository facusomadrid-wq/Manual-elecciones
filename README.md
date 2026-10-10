# Manual de Elecciones Sindicales · versión interactiva (FAC-USO)

Versión web, móvil y sin conexión del **Manual de Elecciones Sindicales** de USO (edición de marzo de 2023, 111 páginas), con el **contenido íntegro** del original y herramientas de cálculo.

| Qué | Dónde |
|---|---|
| Web completa (GitHub Pages / PWA instalable) | `docs/index.html` |
| **Un solo archivo** para enviar por WhatsApp o correo (funciona sin internet) | `docs/manual-elecciones-facuso.html` |
| Manual original | `sindicato-uso-manual-electoral-2022-2026-w.pdf` |

## Qué incluye
- 29 apartados (introducción, 27 capítulos y anexo) con numeración idéntica a la del manual; recuadros *Importante / Comentario / Ejemplo*, citas legales destacadas, tablas adaptadas al móvil y los modelos oficiales (Modelo 4, Modelo 8 y papeletas) como imágenes ampliables.
- Buscador sin tildes, índice por partes, filtro por colectivo (empresa y personal laboral / funcionariado), modo oscuro, tamaño de letra, glosario que se abre al tocar siglas y términos, favoritos y notas personales (solo en tu dispositivo).
- **Herramientas** (`#/herramientas`): ¿qué órgano me corresponde?, plantilla con eventuales, reparto por colegios, atribución de resultados (cociente y restos / listas abiertas), plazos y calendario (preaviso, votación, Anexo I) con exportación a `.ics` y Google Calendar, línea de tiempo, listas de comprobación por rol, guía rápida de votos y generador de código QR.
- Las calculadoras están probadas con los ejemplos resueltos del propio manual (`node --test web/pruebas/`).

> Las herramientas son **orientativas**: no sustituyen al texto legal ni al asesoramiento de la Oficina Electoral. El contenido refleja la edición de 2023 del manual.

## Cómo actualizar el contenido
1. Edita el capítulo en `contenido/NN.md` (por ejemplo desde GitHub, con el lápiz ✏️).
2. Sintaxis especial: `::: importante … :::` (también `comentario`, `ejemplo`, `nota`, `pasos`), `[[(Art. 67.1 E.T.)]]` para citas legales, `{{texto}}` para texto en rojo, tablas con `|`.
3. Con GitHub Actions (`.github/workflows/publicar.yml`) la web se regenera sola al subir cambios a `main`. A mano: `python3 scripts/construir.py`.

## Cómo se generó (reproducible)
```
./scripts/todo.sh
```
`extraer.py` (PDF → borrador Markdown) → `curar.py` (tablas e imágenes transcritas, recuadros, erratas) → `recortar.py` (figuras) → `verificar.py` (compara palabra a palabra el PDF con el Markdown: **99,95 %**; lo que no coincide son las erratas corregidas —`contenido/_erratas.md`— y las etiquetas de los formularios, que van como imagen) → `construir.py` (HTML/CSS/JS, PWA y versión de un solo archivo).
Dependencias: `pdfplumber markdown-it-py mdit-py-plugins beautifulsoup4 pillow`, `poppler-utils` y Node 20+.

## Notas
- Las tablas de escalas (cap. 3), el flujo del voto por correo (cap. 18) y los formularios (cap. 13 y 16) son imágenes en el PDF: se han transcrito o recortado y se indican en el código con «transcrito de imagen».
- Los títulos de capítulo usan el índice del manual (en los capítulos 23, 24 y 28 la maquetación impresa abrevia el título).
- El diseño usa la paleta FAC-USO (rojo `#E71615`, verde `#00A94E`) y Poppins. No se incluye ningún logotipo: añade el oficial en `web/` si se desea.
- El contenido y la marca del manual son de Unión Sindical Obrera; confirma los permisos de difusión antes de publicarlo abiertamente.
