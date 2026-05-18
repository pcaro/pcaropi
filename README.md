# Pi Config

My personal pi configuration — agents, skills, extensions, and prompts that shape how pi works for me.

## Setup

Clone this repo directly to `~/.pi/agent/` — pi auto-discovers everything from there (extensions, skills, agents, AGENTS.md, mcp.json). No symlinks, no manual wiring.

### Fresh machine

```bash
# 1. Install pi (https://github.com/badlogic/pi)

# 2. Clone this repo as your agent config
mkdir -p ~/.pi
git clone git@github.com:HazAT/pi-config ~/.pi/agent

# 3. Run setup (installs packages + extension deps)
cd ~/.pi/agent && ./setup.sh

# 4. Add your API keys to ~/.pi/agent/auth.json

# 5. Restart pi
```

### Updating

```bash
cd ~/.pi/agent && git pull
```

---

## Skills

Custom skills located in `skills/`:

| Skill                                   | When to use                                                                                         | Tools / Scripts                                           |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **add-mcp-server**                      | Añadir servidores MCP (globales o por proyecto)                                                     | `~/.pi/agent/mcp.json`                                    |
| **brainstorm**                          | Brainstorming estructurado: investigar → clarificar → explorar → validar → planear → crear TODOs    | ask_user, write                                           |
| **cli-tools**                           | Referencia rápida de CLI: jq, fx, deep, sqlite-utils, gh, gw, httpie, shot-scraper, bq, snow, stern | (referencia)                                              |
| **code-simplifier**                     | Simplificar y refinar código para claridad y mantenibilidad                                         | read, edit                                                |
| **commit**                              | Crear commits pulidos con formato Conventional Commits (usar **siempre** antes de commitear)        | git                                                       |
| **crit**                                | Trabajar con crit CLI: comentarios, revisiones, push/pull de PRs                                    | crit CLI                                                  |
| **frontend-design**                     | Crear interfaces frontend de calidad de producción (componentes web, páginas, apps)                 | read, write, bash                                         |
| **github**                              | Interactuar con GitHub — PRs, issues, CI, API                                                       | `gh` CLI                                                  |
| **google-workspace**                    | Acceder a Drive, Docs, Calendar, Gmail, Sheets, Slides, Chat, People sin MCP                        | `scripts/auth.js`, `scripts/workspace.js`                 |
| **herdr**                               | Controlar herdr desde dentro: workspaces, tabs, paneles, spawn agentes (cuando HERDR_ENV=1)         | herdr CLI, unix socket                                    |
| **learn-codebase**                      | Descubrir convenciones del proyecto y escanear riesgos de seguridad al empezar en un código nuevo   | grep, find, read                                          |
| **presentation-creator**                | Crear presentaciones con datos usando React, Vite, Recharts y branding Sentry                       | bash, write, npm                                          |
| **preview-markdown-browser**            | Renderizar la última respuesta (o un .md) como HTML en el navegador                                 | bash                                                      |
| **review-rubric**                       | Guía y rúbrica de calidad para revisiones de código (usada por /review y el subagente reviewer)     | (referencia)                                              |
| **ruff**                                | Linter y formateador de Python (usar **siempre** con código Python)                                 | `ruff` CLI                                                |
| **session-reader**                      | Leer y analizar archivos .jsonl de sesiones de pi                                                   | bash, read                                                |
| **[show-me](skills/show-me/README.md)** | Demostrar que el código funciona — grabar sesiones demo en Kitty                                    | `scripts/kitty_screenshot.sh`, `scripts/wait_for_text.sh` |
| **summarize**                           | Convertir URL/PDF/DOCX/PPTX a Markdown con markitdown                                               | `to-markdown.mjs`                                         |
| **ty**                                  | Type checker de Python ultrarrápido (pyright) — usar **siempre** con código Python                  | `ty` CLI                                                  |
| **update-changelog**                    | Actualizar CHANGELOG.md entre releases                                                              | (referencia)                                              |
| **uv**                                  | Gestor de paquetes Python (usar **siempre** en lugar de pip/poetry con código Python)               | `uv` CLI                                                  |
| **web-browser**                         | Interactuar con páginas web (click, formularios, navegación) vía Chrome headless CDP                | `scripts/*.js` (CDP)                                      |

#### Quick Reference

- **Python code**: Usar `uv` + `ruff` + `ty` siempre (gestor, linter, type checker)
- **Commits**: Usar `commit` siempre antes de cualquier commit
- **Demos**: Usar `show-me` para probar que el código funciona
- **Extracción de datos**: Usar `summarize` para docs, `cli-tools` para JSON
- **GitHub**: Usar `github` para PRs, issues, CI
- **Web**: Usar `web-browser` para automatización de navegador
- **Google Workspace**: Usar `google-workspace` para Drive/Docs/Calendar
- **Planificación**: Usar `brainstorm` antes de cambios grandes
- **Frontend**: Usar `frontend-design` para componentes web/interfaces
- **MCP**: Usar `add-mcp-server` para configurar servidores MCP
- **Código nuevo**: Usar `learn-codebase` para explorar proyectos desconocidos
- **Refactor**: Usar `code-simplifier` para limpiar y simplificar código
- **Presentaciones**: Usar `presentation-creator` para slides con datos

## Extensions

### Internas (auto-descubiertas de `extensions/`)

Todas las extensiones en `~/.pi/agent/extensions/` se cargan automáticamente (salvo `uv-with-cwd.ts` que está excluida explícitamente en settings):

| Extensión               | Comando(s)       | ¿Qué hace?                                                                                                                                |
| ----------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **answer**              | `/answer`        | Q&A interactivo. Extrae preguntas de mensajes del asistente y las responde una por una vía UI nativa (`Ctrl+.`). Fallback cuando el modelo olvidó usar `ask_user`. |
| **branch**              | `/branch`        | Resume la conversación actual y arranca una nueva rama (hija) con el contexto comprimido.                                                  |
|                         | `/compress`      | Resume toda la sesión y crea una sesión nueva con el resumen (la original se preserva).                                                    |
|                         | `/branches`      | Muestra el árbol de resúmenes de las ramas de la sesión actual con tamaño y preview.                                                       |
| **ci-index**            | `/ci`            | Muestra el Coding Index (CI) de cualquier modelo basado en benchmarks de Artificial Analysis.                                              |
|                         | `/ci-top`        | Lista los mejores modelos de código por puntuación CI.                                                                                    |
| **context**             | `/context`       | Muestra una vista general del contexto cargado: tokens, skills, AGENTS.md, extensiones, prompts, archivos de sesión.                      |
| **cost**                | `/cost [días]`   | Resumen de coste de API (por defecto 7 días) extrayendo datos de los archivos .jsonl de sesión.                                           |
| **execute-command**     | *(tool interno)* | Registra la herramienta `execute_command` para que el agente pueda auto-invocar comandos slash (`/answer`, `/reload`, etc.) o enviarse mensajes a sí mismo. |
| **files**               | `/files`         | Explorador de archivos interactivo con estado git, referencias de sesión, vista rápida y reveal en Finder.                                |
| **get-current-time**    | *(tool interno)* | Registra la herramienta `get_current_time` para que el agente pueda consultar la fecha/hora actual.                                       |
| **guardrails.json**     | *(config)*       | Políticas de protección de archivos para `@aliou/pi-guardrails`: bloquea `.env`, claves privadas, etc.                                    |
| **handoff**             | `/handoff`       | Transfiere contexto a una nueva sesión enfocada. El LLM extrae decisiones, archivos tocados y hallazgos clave, y genera un prompt inicial. |
| **herdr-agent-state**   | *(automático)*   | Reporta el estado del agente pi (working/blocked/idle) a herdr vía unix socket para seguimiento en pane.                                  |
| **hooks**               | *(wiring)*       | Punto de entrada único que registra los hooks de `terminal-title`, `session-name` y `system-prompt`.                                      |
| **notify**              | *(automático)*   | Envía notificaciones de escritorio (`notify-send`) cuando el agente completa un turno.                                                     |
| **review**              | `/review`        | Revisión de código interactiva. Soporta: PRs de GitHub, ramas, commits, cambios sin stage, o instrucciones personalizadas.                |
| **session-breakdown**   | `/session-breakdown` | Desglose interactivo del historial de sesiones (7/30/90 días): sesiones, mensajes, tokens y coste por modelo, con gráfico inline.     |
| **session-name**        | *(automático)*   | Genera automáticamente nombres descriptivos de sesión usando IA tras el primer turno del asistente.                                        |
| **system-prompt**       | *(automático)*   | Añade guías de uso de herramientas al system prompt antes de cada turno del agente.                                                       |
| **terminal-title**      | *(automático)*   | Actualiza el título de la ventana del terminal con el proyecto/directorio actual.                                                         |
| **todos**               | `/todos`         | Gestor de TODOs en Markdown con respaldo en archivos. Listar, crear, asignar (`claim`), actualizar y cerrar tareas con bloqueo y TUI.     |
| **usage**               | `/usage`         | Dashboard de estadísticas de uso. Cicla Hoy / Esta Semana / Todo el tiempo. Muestra coste, tokens y mensajes por provider y modelo.       |
| **watchdog**            | `/watchdog`      | Monitor de sesión. Usa un modelo juez (Haiku) para detectar si el agente está atascado, en bucle o necesita intervención. Puede nudear o abortar. |

### Externas (instaladas como paquetes npm/git)

| Paquete                          | Fuente           | ¿Qué hace?                                                                                                                                                                                          |
| -------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **pi-powerline-footer**          | npm              | Barra de estado estilo Powerline en el TUI. Muestra logo, modelo, atajos, conteo de skills/extensiones, uso de contexto (alertas al 70%/90%), sesiones recientes, indicador de stash y temas /vibe. |
| **@aliou/pi-guardrails**         | npm              | Seguridad: protege archivos sensibles (`.env`, claves), bloquea comandos peligrosos, controla acceso a rutas fuera del workspace.                                                                   |
| **@tmustier/pi-tab-status**      | npm              | Indicadores en pestañas del terminal para sesiones paralelas: ✅ done, 🚧 stuck, 🛑 timed out.                                                                                                      |
| **@tmustier/pi-code-actions**    | npm              | Selecciona bloques de código de mensajes del asistente para copiar, insertar o ejecutar con `/code`.                                                                                                |
| **chrome-cdp-skill**             | git (pasky)      | Habilidad para inspeccionar/depurar Chrome local vía CDP (solo con aprobación explícita).                                                                                                           |
| **pi-mcp-adapter**               | git (nicobailon) | Adaptador MCP eficiente (~200 tokens). Descubre y usa servidores MCP bajo demanda, arranque lazy, integración con subagentes y UIs interactivas.                                                    |
| **@aliou/pi-processes**          | npm              | Gestión de procesos en segundo plano. Lanza servidores, test watchers, builds sin bloquear la conversación.                                                                                         |
| **pi-prompt-template-model**     | npm              | Añade frontmatter de modelo/skill/thinking a prompt templates. Cada template es un modo de agente autocontenido.                                                                                    |
| **pi-interactive-shell**         | npm              | Ejecuta CLIs interactivos (vim, psql, ssh, npm dev) en overlay TUI. Modos: interactive, hands-free, dispatch, monitor.                                                                              |
| **@aliou/pi-linkup**             | npm              | Búsqueda web y extracción de contenido: `linkup_web_search`, `linkup_web_answer`, `linkup_web_fetch`.                                                                                               |
| **pi-markdown-preview**          | git (omaclaren)  | Previsualiza respuestas y archivos Markdown/LaTeX/código/diff en terminal, navegador o PDF. Con matemáticas, Mermaid y temas.                                                                       |
| **pi-token-burden**              | git (Whamp)      | Desglose del presupuesto de tokens del system prompt vía `/token-burden`.                                                                                                                           |
| **pi-smart-sessions**            | git (HazAT)      | Selector compacto de sesiones (`/sessions`) con navegación por flechas.                                                                                                                             |
| **pi-head**                      | git (omerxx)     | Resumen de una línea al reenfocar el terminal tras inactividad. Ayuda con múltiples sesiones.                                                                                                       |
| **pi-add-dir**                   | git (itisbryan)  | Añade un directorio externo a la sesión cargando su AGENTS.md y skills.                                                                                                                             |
| **pi-subagents**                 | npm              | Delegación a subagentes especializados (scout, worker, reviewer, planner, oracle). Cadenas, paralelo, foreground/background.                                                                        |
| **pi-lens**                      | npm              | Feedback de código en tiempo real: LSP (diagnósticos, definiciones, referencias), linters, formatters, type-checking, ast-grep.                                                                     |
| **pi-schedule-prompt**           | npm              | Programa prompts recurrentes con sintaxis cron. Comando `/schedule-prompt`.                                                                                                                         |
| **pi-ask-user**                  | npm              | Herramienta `ask_user` para que el agente haga preguntas estructuradas durante la ejecución con overlay interactivo.                                                                                |
| **@ogulcancelik/pi-sketch**      | npm              | Dibujo y bocetos desde Pi en el terminal.                                                                                                                                                           |
| **@matheusbbarni/pi-stitch-mcp** | npm              | Integración con Stitch MCP: estado de conexión, listar/leer recursos, prompts de servidores MCP.                                                                                                    |
| **pi-inspect**                   | npm              | Inspecciona qué tiene cargado Pi (prompts, directrices, tools, skills) sin rediscovery.                                                                                                             |
| **pi-slopchop**                  | npm              | Revisión y anotación de código nativa en terminal. Anotaciones FIX/DISCUSS sobre el diff. Comando `/slopchop`.                                                                                      |

## Themes

Custom themes located in `pi-themes/`.

## Commands

Custom prompt templates located in `commands/`.

---

This config uses subagents (folder `agents`) using [pi-subagents](https://github.com/badlogic/pi-subagents).
