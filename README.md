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
| **anti-ai-copy**                        | Editar textos para que suenen humanos, concretos y sin marcas de IA (hype verbs, abstracciones, transiciones sintéticas) | read, edit                                                |
| **brainstorm**                          | Brainstorming estructurado: investigar → clarificar → explorar → validar → planear → crear TODOs    | ask_user, write                                           |
| **cli-tools**                           | Referencia rápida de CLI: jq, fx, deep, sqlite-utils, gh, gw, httpie, shot-scraper, bq, snow, stern | (referencia)                                              |
| **code-simplifier**                     | Simplificar y refinar código para claridad y mantenibilidad                                         | read, edit                                                |
| **commit**                              | Crear commits pulidos con formato Conventional Commits (usar **siempre** antes de commitear)        | git                                                       |
| **crit**                                | Trabajar con crit CLI: comentarios, revisiones, push/pull de PRs                                    | crit CLI                                                  |
| **documentation-writing**                | Escribir docs de usuario: tutoriales, how-tos, referencias, READMEs, changelogs, benchmarks         | read, write                                               |
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
| **subagent-delegation**                  | Decidir cuándo delegar trabajo acotado a subagentes y qué modelo usar (downshift/upshift)          | `list_pi_models`, `subagent`, `TaskExecute`               |
| **[show-me](skills/show-me/README.md)** | Demostrar que el código funciona — grabar sesiones demo en Kitty                                    | `scripts/kitty_screenshot.sh`, `scripts/wait_for_text.sh` |
| **summarize**                           | Convertir URL/PDF/DOCX/PPTX a Markdown con markitdown                                               | `to-markdown.mjs`                                         |
| **ty**                                  | Type checker de Python ultrarrápido (pyright) — usar **siempre** con código Python                  | `ty` CLI                                                  |
| **update-changelog**                    | Actualizar CHANGELOG.md entre releases                                                              | (referencia)                                              |
| **uv**                                  | Gestor de paquetes Python (usar **siempre** en lugar de pip/poetry con código Python)               | `uv` CLI                                                  |
| **verification-before-completion**       | Exigir evidencia fresca antes de afirmar que algo está hecho (tests, build, lint, diff)             | git, bash                                                 |
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

Todas las extensiones en `extensions/` se cargan automáticamente (salvo `uv-with-cwd.ts` que está excluida explícitamente en settings):

#### Sesión y contexto

| Extensión                                                | Comando(s)           | ¿Qué hace?                                                                                                                   |
| -------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [**context**](extensions/context.ts)                     | `/context`           | Muestra el contexto cargado: tokens, skills, AGENTS.md, extensiones, prompts y archivos de sesión.                           |
| [**session-name**](extensions/session-name.ts)           | _(automático)_       | Genera nombres descriptivos de sesión con IA tras el primer turno del asistente.                                             |
| [**session-breakdown**](extensions/session-breakdown.ts) | `/session-breakdown` | Desglose interactivo del historial (7/30/90 días): sesiones, mensajes, tokens y coste por modelo con gráfico inline.         |
| [**branch**](extensions/branch.ts)                       | `/branch`            | Resume la conversación y arranca una nueva rama hija con el contexto comprimido.                                             |
|                                                          | `/compress`          | Resume toda la sesión y crea una sesión nueva (la original se preserva).                                                     |
|                                                          | `/branches`          | Muestra el árbol de resúmenes de ramas con tamaño y preview.                                                                 |
| [**handoff**](extensions/handoff.ts)                     | `/handoff`           | Transfiere contexto a una nueva sesión: el LLM extrae decisiones, archivos y hallazgos clave para generar un prompt inicial. |
| [**answer**](extensions/answer.ts)                       | `/answer`            | Q&A interactivo. Extrae preguntas del mensaje del asistente y las responde una por una vía UI nativa (`Ctrl+.`).             |
| [**structured-prompt**](extensions/structured-prompt/)   | `/prompt`<br>`Ctrl+Alt+P` | Formulario estructurado para componer prompts en secciones (Goal, Task, Context, Criteria, Constraints, Work order). Copiado de [n-r-w/pi-agent-suite](https://github.com/n-r-w/pi-agent-suite). |

#### Código y archivos

| Extensión                              | Comando(s)  | ¿Qué hace?                                                                                                                    |
| -------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [**files**](extensions/files.ts)       | `/files`    | Explorador de archivos interactivo con estado git, referencias de sesión, vista rápida y reveal en Finder.                    |
| [**review**](extensions/review.ts)     | `/review`   | Revisión de código interactiva. Soporta PRs de GitHub, ramas, commits, cambios sin stage e instrucciones personalizadas.      |
| [**todos**](extensions/todos.ts)       | `/todos`    | Gestor de TODOs en Markdown con respaldo en archivos. Crear, asignar (`claim`), actualizar y cerrar tareas con bloqueo y TUI. |
| [**watchdog**](extensions/watchdog.ts) | `/watchdog` | Monitor de sesión. Usa Haiku como juez para detectar si el agente está atascado, en bucle o necesita intervención.            |

#### Terminal y escritorio

| Extensión                                                | Comando(s)     | ¿Qué hace?                                                                                       |
| -------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------ |
| [**terminal-title**](extensions/terminal-title.ts)       | _(automático)_ | Actualiza el título de la ventana del terminal con el proyecto/directorio actual.                |
| [**notify**](extensions/notify.ts)                       | _(automático)_ | Notificaciones de escritorio (`notify-send`) cuando el agente completa un turno.                 |
| [**herdr-agent-state**](extensions/herdr-agent-state.ts) | _(automático)_ | Reporta el estado de pi (working/blocked/idle) a herdr vía unix socket para seguimiento en pane. |

#### Sistema del agente

| Extensión                                              | Comando(s)       | ¿Qué hace?                                                                                                                     |
| ------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [**execute-command**](extensions/execute-command.ts)   | _(tool interno)_ | Registra `execute_command` para que el agente se auto-invoque comandos slash (`/answer`, `/reload`, etc.) o se envíe mensajes. |
| [**get-current-time**](extensions/get-current-time.ts) | _(tool interno)_ | Registra `get_current_time` para que el agente consulte la fecha/hora actual.                                                  |
| [**system-prompt**](extensions/system-prompt.ts)       | _(automático)_   | Añade guías de uso de herramientas al system prompt antes de cada turno del agente.                                            |
| [**hooks**](extensions/hooks.ts)                       | _(wiring)_       | Punto de entrada único que registra los hooks de `terminal-title`, `session-name` y `system-prompt`.                           |

#### Métricas

| Extensión                              | Comando(s)     | ¿Qué hace?                                                                                                                  |
| -------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [**cost**](extensions/cost.ts)         | `/cost [días]` | Resumen de coste de API (por defecto 7 días) extrayendo datos de los archivos .jsonl de sesión.                             |
| [**usage**](extensions/usage/)         | `/usage`       | Dashboard de estadísticas de uso. Cicla Hoy / Esta Semana / Todo el tiempo. Coste, tokens y mensajes por provider y modelo. |
| [**ci-index**](extensions/ci-index.ts) | `/ci`          | Muestra el Coding Index (CI) de cualquier modelo según benchmarks de Artificial Analysis.                                   |
|                                        | `/ci-top`      | Lista los mejores modelos de código por puntuación CI.                                                                      |

#### Seguridad

| Extensión                                         | Comando(s) | ¿Qué hace?                                                                                             |
| ------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| [**dirty-repo-guard**](extensions/dirty-repo-guard/index.ts) | _(automático)_ | Bloquea cambios de sesión cuando hay cambios sin commit en el repo. Pregunta antes de hacer switch/fork con el working directory sucio. |
| [**guardrails.json**](extensions/guardrails.json) | _(config)_ | Políticas de protección de archivos para `@aliou/pi-guardrails`: bloquea `.env`, claves privadas, etc. |

### Externas (instaladas como paquetes npm/git)

#### Interfaz de usuario

| Paquete                                                                      | Repo                | ¿Qué hace?                                                                                                                                                   |
| ---------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [**pi-powerline-footer**](https://github.com/nicobailon/pi-powerline-footer) | GitHub (nicobailon) | Barra de estado Powerline en el TUI. Logo, modelo, atajos, skills/extensiones cargadas, contexto (alertas 70%/90%), sesiones recientes, stash y temas /vibe. |
| [**pi-markdown-preview**](https://github.com/omaclaren/pi-markdown-preview)  | GitHub (omaclaren)  | Previsualiza respuestas y archivos Markdown/LaTeX/código/diff en terminal (PNG), navegador o PDF. Con matemáticas, Mermaid y temas.                          |
| [**@tmustier/pi-tab-status**](https://github.com/tmustier/pi-extensions)     | GitHub (tmustier)   | Indicadores en pestañas del terminal para sesiones paralelas: ✅ done, 🚧 stuck, 🛑 timed out.                                                               |

#### Delegación y agentes

| Paquete                                                                        | Repo                | ¿Qué hace?                                                                                                             |
| ------------------------------------------------------------------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [**pi-subagents**](https://github.com/nicobailon/pi-subagents)                 | GitHub (nicobailon) | Delegación a subagentes (scout, worker, reviewer, planner, oracle). Cadenas, paralelo, foreground/background.          |
| [**pi-interactive-shell**](https://github.com/nicobailon/pi-interactive-shell) | GitHub (nicobailon) | Ejecuta CLIs interactivos (vim, psql, ssh, npm dev) en overlay TUI. Modos: interactive, hands-free, dispatch, monitor. |
| [**pi-intercom**](https://github.com/nicobailon/pi-intercom)                   | GitHub (nicobailon) | Mensajería 1:1 directa entre sesiones de Pi en la misma máquina. Herramienta `intercom` + overlay `/intercom`.          |
| [**pi-ralplan**](https://www.npmjs.com/package/pi-ralplan)                     | npm                 | Planificación por consenso: spec → plan → ejecución con iteración Planner/Architect/Critic.                            |

#### Sesión y prompts

| Paquete                                                                                           | Repo                     | ¿Qué hace?                                                                                                                           |
| ------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| [**pi-invisible-continue**](https://github.com/monotykamary/pi-invisible-continue)                | GitHub (monotykamary)    | `/continue` reanuda el loop del agente sin que el LLM vea ningún prompt nuevo. Sin contaminación de contexto.                        |
| [**pi-edit-session-in-place**](https://www.npmjs.com/package/pi-edit-session-in-place)            | npm                      | Re-edita o elimina mensajes anteriores del usuario en la rama actual de la sesión.                                                   |
| [**pi-copy-user-message**](https://www.npmjs.com/package/pi-copy-user-message)                    | npm                      | `/copy-user` copia el mensaje más reciente del usuario al portapapeles.                                                              |
| [**pi-slim**](https://www.npmjs.com/package/pi-slim)                                              | npm                      | Adelgaza el system prompt por defecto. La documentación de Pi pasa a ser opt-in vía `/pi`.                                            |
| [**@howaboua/pi-auto-trees**](https://github.com/IgorWarzocha/howaboua-pi-stuff/tree/main/packages/pi-auto-trees) | GitHub (IgorWarzocha) | Flujo incremental en sesiones largas: `/marker` fija un checkpoint, `/end` resume el trabajo hecho, vuelve al marker y avanza. Mantiene el contexto útil, descarta el ruido de implementación. Modos: `git`, `full`, custom prompt. |

#### Seguridad y control

| Paquete                                                            | Repo           | ¿Qué hace?                                                                                                             |
| ------------------------------------------------------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [**@aliou/pi-guardrails**](https://github.com/aliou/pi-guardrails) | GitHub (aliou) | Protege archivos sensibles (`.env`, claves), bloquea comandos peligrosos, controla acceso a rutas fuera del workspace. |
| [**pi-inspect**](https://www.npmjs.com/package/pi-inspect)         | npm            | Inspecciona qué tiene cargado Pi (prompts, directrices, tools, skills) sin rediscovery.                                |

#### MCP y conectividad externa

| Paquete                                                                                        | Repo                | ¿Qué hace?                                                                                            |
| ---------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------- |
| [**pi-mcp-adapter**](https://github.com/nicobailon/pi-mcp-adapter)                             | GitHub (nicobailon) | Adaptador MCP (~200 tokens). Descubre servidores MCP bajo demanda, arranque lazy, UIs interactivas.   |
| [**@matheusbbarni/pi-stitch-mcp**](https://www.npmjs.com/package/@matheusbbarni/pi-stitch-mcp) | npm                 | Integración con Stitch MCP: estado de conexión, listar/leer recursos y prompts de servidores MCP.     |
| [**@aliou/pi-linkup**](https://github.com/aliou/pi-linkup)                                     | GitHub (aliou)      | Búsqueda web y extracción de contenido: `linkup_web_search`, `linkup_web_answer`, `linkup_web_fetch`. |
| [**chrome-cdp-skill**](https://github.com/pasky/chrome-cdp-skill)                              | GitHub (pasky)      | Inspeccionar/depurar Chrome local vía CDP (solo con aprobación explícita).                            |
| [**pi-add-dir**](https://github.com/itisbryan/pi-add-dir)                                      | GitHub (itisbryan)  | Añade directorios externos a la sesión cargando su AGENTS.md y skills.                                |

#### Procesos y automatización

| Paquete                                                                                | Repo                | ¿Qué hace?                                                                                                       |
| -------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [**@aliou/pi-processes**](https://github.com/aliou/pi-processes)                       | GitHub (aliou)      | Gestión de procesos en segundo plano. Lanza servidores, test watchers y builds sin bloquear la conversación.     |
| [**pi-schedule-prompt**](https://github.com/tintinweb/pi-schedule-prompt)              | GitHub (tintinweb)  | Programa prompts recurrentes con sintaxis cron. Comando `/schedule-prompt`.                                      |
| [**pi-prompt-template-model**](https://github.com/nicobailon/pi-prompt-template-model) | GitHub (nicobailon) | Añade frontmatter de modelo/skill/thinking a prompt templates. Cada template es un modo de agente autocontenido. |

#### Análisis de código

| Paquete                                                                    | Repo               | ¿Qué hace?                                                                                                     |
| -------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------- |
| [**pi-lens**](https://github.com/apmantza/pi-lens)                         | GitHub (apmantza)  | Feedback de código en tiempo real: LSP, linters, formatters, type-checking, ast-grep.                          |
| [**pi-token-burden**](https://github.com/Whamp/pi-token-burden)            | GitHub (Whamp)     | Desglose del presupuesto de tokens del system prompt vía `/token-burden`. Preferido sobre `pi-context-usage` (misión similar). |
| [**pi-slopchop**](https://github.com/robzolkos/pi-slopchop)                | GitHub (robzolkos) | Revisión y anotación de código nativa en terminal. Anotaciones FIX/DISCUSS sobre el diff. Comando `/slopchop`. |
| [**@tmustier/pi-code-actions**](https://github.com/tmustier/pi-extensions) | GitHub (tmustier)  | Selecciona bloques de código de mensajes del asistente para copiar, insertar o ejecutar con `/code`.           |

#### Sistema del agente

| Paquete                                                                           | Repo                     | ¿Qué hace?                                                                                          |
| --------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------- |
| [**pi-codex-goal**](https://www.npmjs.com/package/pi-codex-goal)                  | npm                      | Seguimiento de objetivos estilo Codex: `get_goal`, `create_goal`, `update_goal` para sesiones long-running. |
| [**pi-cache-optimizer**](https://www.npmjs.com/package/pi-cache-optimizer)       | npm                      | Mejora las tasas de caché de prompts/KV con claves estables y estadísticas en el footer.            |
| [**pi-cache-graph**](https://github.com/championswimmer/pi-cache-graph)       | GitHub (championswimmer) | Gráfico en vivo de hits/misses de prefix cache del proveedor directamente en el TUI. Comando `/cache-graph`. |
| [**@badliveware/pi-model-catalog**](https://www.npmjs.com/package/@badliveware/pi-model-catalog) | npm | Expone el catálogo de modelos de Pi como herramienta para el agente (`list_pi_models`).              |

#### Utilidades

| Paquete                                                                      | Repo                  | ¿Qué hace?                                                                                                                 |
| ---------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [**pi-head**](https://github.com/omerxx/pi-head)                             | GitHub (omerxx)       | Resumen de una línea al reenfocar el terminal tras inactividad. Ayuda con múltiples sesiones.                              |
| [**pi-context-prune**](https://github.com/championswimmer/pi-context-prune)  | GitHub (championswimmer) | Resume batches de tool calls completados y poda los outputs crudos del contexto futuro. Recuperables vía `context_tree_query`. |
| [**pi-smart-sessions**](https://github.com/HazAT/pi-smart-sessions)          | GitHub (HazAT)        | Selector compacto de sesiones (`/sessions`) con navegación por flechas.                                                    |
| [**pi-ask-user**](https://github.com/nicobailon/pi-ask-user)                 | GitHub (nicobailon)   | Herramienta `ask_user` para preguntas estructuradas al agente con overlay interactivo, opciones múltiples y entrada libre. |
| [**@ogulcancelik/pi-sketch**](https://github.com/ogulcancelik/pi-extensions) | GitHub (ogulcancelik) | Dibujo y bocetos desde Pi en el terminal.                                                                                  |
| [**@diegopetrucci/pi-librarian**](https://www.npmjs.com/package/@diegopetrucci/pi-librarian) | npm | Investigación en GitHub con caché local de repos. Búsqueda web con evidencias y citas de código.                            |
| [**@badliveware/pi-pr-upstream-status**](https://www.npmjs.com/package/@badliveware/pi-pr-upstream-status) | npm | Muestra el estado del PR upstream de la rama actual (abierto, mergeado, cerrado).                                            |
| [**@mazli/pi-worktree**](https://github.com/HamdiMaz/Worktree)                   | GitHub (HamdiMaz)      | Crea y gestiona git worktrees desde Pi. `/worktree <rama>` abre una sesión aislada en `.worktrees/`, creando la rama y copiando recursos `.pi` automáticamente. |

## Themes

Custom themes located in `pi-themes/`.

## Commands

Custom prompt templates located in `commands/`.

---

This config uses subagents (folder `agents`) using [pi-subagents](https://github.com/badlogic/pi-subagents).
