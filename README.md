# Pi Config

My personal pi configuration — agents, skills, extensions, and prompts that shape how pi works for me.

## Setup

Clone this repo directly to `~/.pi/agent/` — pi auto-discovers everything from there (extensions, skills, agents, AGENTS.md, APPEND_SYSTEM.md, mcp.json). No symlinks, no manual wiring.

### Fresh machine

```bash
# 1. Install pi, plus gh (private skills repo) and gitleaks (commit hook)

# 2. Let gh drive git over HTTPS — no SSH key required
gh auth login
gh auth setup-git

# 3. Clone config and shared skills
mkdir -p ~/.pi
git clone https://github.com/pcaro/pcaropi ~/.pi/agent
git clone https://github.com/pcaro/agent-skills ~/.agents

# 4. Enable the commit hook — core.hooksPath is local git config, it does not clone
cd ~/.pi/agent && git config core.hooksPath .githooks

# 5. Install the packages declared in settings.json
pi update --extensions

# 6. Credentials: run /login inside pi, one per provider you use
pi          # then /login anthropic, /login openrouter, ...
```

`mcp.json` is machine-local and is not cloned; recreate it as described in [MCP servers](#mcp-servers).

### Updating

```bash
cd ~/.pi/agent && git pull
```

### MCP servers

`mcp.json` no se versiona: es específico de la máquina y depende de variables de entorno. Para reconstruirlo:

```bash
export LINKUP_API_KEY=...   # https://app.linkup.so

pi mcp add linkup --url https://mcp.linkup.so/mcp \
  --bearer-token-env-var LINKUP_API_KEY \
  --description "Linkup web search, fetch/scrape, and long-running research over the live web"
```

La key viaja como header `Authorization: Bearer ${LINKUP_API_KEY}`, nunca en la URL. Los tools salen como `mcp__linkup__linkup_search`, `..._fetch`, `..._research` y `..._get_research`; los detalles de uso están en la skill [**linkup-mcp**](skills/linkup-mcp/SKILL.md).

---

## Skills

Only the skills shaped around pi's own tools live here. Everything agent-agnostic
(Python tooling, git, writing, design, CLIs) moved to
[`pcaro/agent-skills`](https://github.com/pcaro/agent-skills), which installs to
`~/.agents/skills` — a path both pi and opencode read natively.

| Skill                                   | When to use                                                                                         | Tools / Scripts                                           |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **linkup-mcp**                          | Llamar a Linkup vía MCP: nombres con guiones bajos, shape de respuesta, codemode para no reventar contexto, cuándo caer al REST | `linkup_search`, `linkup_fetch`, `linkup_research`        |
| **session-reader**                      | Leer y analizar archivos .jsonl de sesiones de pi                                                   | bash, read                                                |
| **subagent-delegation**                 | Decidir cuándo delegar trabajo acotado a subagentes y qué modelo usar (downshift/upshift)           | `pi --list-models`, `subagent`, `TaskExecute`             |

#### Quick Reference

> Nota: estas skills viven en `~/.agents` (repo [`pcaro/agent-skills`](https://github.com/pcaro/agent-skills)), no en `skills/`.

- **Python code**: Usar `uv` + `ruff` + `ty` siempre (gestor, linter, type checker)
- **Commits**: Usar `commit` siempre antes de cualquier commit
- **Demos**: Usar `show-me` para probar que el código funciona
- **Extracción de datos**: Usar `summarize` para docs, `cli-tools` para JSON
- **GitHub**: Usar `github` para PRs, issues, CI
- **Web**: Usar `web-browser` para automatización de navegador
- **Google Workspace**: Usar `google-workspace` para Drive/Docs/Calendar
- **Planificación**: Usar `brainstorm` antes de cambios grandes
- **Frontend**: Usar `frontend-design` para componentes web/interfaces
- **Código nuevo**: Usar `learn-codebase` para explorar proyectos desconocidos
- **Refactor**: Usar `code-simplifier` para limpiar y simplificar código
- **Presentaciones**: Usar `presentation-creator` para slides con datos

## Extensions

### Internas (auto-descubiertas de `extensions/`)

Todas las extensiones en `extensions/` se cargan automáticamente. `uv-with-cwd.ts` se carga explícitamente vía settings porque reemplaza la tool `bash`:

#### Sesión y contexto

| Extensión                                                | Comando(s)           | ¿Qué hace?                                                                                                                   |
| -------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [**context**](extensions/context.ts)                     | `/context`           | Muestra el contexto cargado: tokens, skills, AGENTS.md, extensiones, prompts y archivos de sesión.                           |
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
| [**review**](extensions/review.ts)     | `/review`   | Revisión de código interactiva. Soporta PRs de GitHub, ramas, commits, cambios sin stage e instrucciones personalizadas.      |
| [**todos**](extensions/todos.ts)       | `/todos`    | Gestor de TODOs en Markdown con respaldo en archivos. Crear, asignar (`claim`), actualizar y cerrar tareas con bloqueo y TUI. |
| [**watchdog**](extensions/watchdog.ts) | `/watchdog` | Monitor de sesión. Usa Haiku como juez para detectar si el agente está atascado, en bucle o necesita intervención.            |

#### Terminal y escritorio

| Extensión                                                | Comando(s)     | ¿Qué hace?                                                                                       |
| -------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------ |
| [**notify**](extensions/notify.ts)                       | _(automático)_ | Notificaciones de escritorio cuando el agente completa un turno: `notify-send` en Linux, `osascript` en macOS. |
| [**herdr-agent-state**](extensions/herdr-agent-state.ts) | _(automático)_ | Reporta el estado de pi (working/blocked/idle) a herdr vía unix socket para seguimiento en pane. |

#### Sistema del agente

| Extensión                                              | Comando(s)       | ¿Qué hace?                                                                                                                     |
| ------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [**execute-command**](extensions/execute-command.ts)   | _(tool interno)_ | Registra `execute_command` para que el agente se auto-invoque comandos slash (`/answer`, `/reload`, etc.) o se envíe mensajes. |
| [**get-current-time**](extensions/get-current-time.ts) | _(tool interno)_ | Registra `get_current_time` para que el agente consulte la fecha/hora actual.                                                  |
| [**uv-with-cwd**](extensions/uv-with-cwd.ts)           | _(tool interno)_ | Reemplaza la tool `bash`: añade parámetro `cwd` e intercepta `python`/`pip`/`poetry` (vía `intercepted-commands/`) para forzar `uv`. |

#### Métricas

| Extensión                              | Comando(s)     | ¿Qué hace?                                                                                                                  |
| -------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [**cost**](extensions/cost.ts)         | `/cost [días]` | Resumen de coste de API (por defecto 7 días) extrayendo datos de los archivos .jsonl de sesión.                             |
| [**usage**](extensions/usage/)         | `/usage`       | Dashboard de estadísticas de uso. Cicla Hoy / Esta Semana / Todo el tiempo. Coste, tokens y mensajes por provider y modelo. |

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
| [**pi-intercom**](https://github.com/nicobailon/pi-intercom)                   | GitHub (nicobailon) | Mensajería 1:1 directa entre sesiones de Pi en la misma máquina. Herramienta `intercom` + overlay `/intercom`.          |

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

Los servidores MCP nativos no son paquetes: los configurados hoy son `linkup` (activo, documentado en [MCP servers](#mcp-servers)) y `teams` (Teams MCP, deshabilitado).

| Paquete                                                                                        | Repo                | ¿Qué hace?                                                                                            |
| ---------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------- |
| [**@matheusbbarni/pi-stitch-mcp**](https://www.npmjs.com/package/@matheusbbarni/pi-stitch-mcp) | npm                 | Integración con Stitch MCP: estado de conexión, listar/leer recursos y prompts de servidores MCP.     |
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
| [**@tmustier/pi-code-actions**](https://github.com/tmustier/pi-extensions) | GitHub (tmustier)  | Selecciona bloques de código de mensajes del asistente para copiar, insertar o ejecutar con `/code`.           |
| [**ponytail**](https://github.com/DietrichGebert/ponytail)                 | GitHub (DietrichGebert) | Modo senior vago: el menor cambio que resuelve la tarea, y una respuesta que se entiende de una lectura. Trae las skills `ponytail`, `ponytail-review`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain` y `ponytail-help`. |

#### Sistema del agente

| Paquete                                                                           | Repo                     | ¿Qué hace?                                                                                          |
| --------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------- |
| [**pi-codex-goal**](https://www.npmjs.com/package/pi-codex-goal)                  | npm                      | Seguimiento de objetivos estilo Codex: `get_goal`, `create_goal`, `update_goal` para sesiones long-running. |
| [**pi-cache-optimizer**](https://www.npmjs.com/package/pi-cache-optimizer)       | npm                      | Mejora las tasas de caché de prompts/KV con claves estables y estadísticas en el footer.            |
| [**@fyeeme/pi-session-name**](https://github.com/fyeeme/pi-packages)            | GitHub (fyeeme)          | Auto-nombra sesiones con IA (modos follow/first/auto), `/rename`, y nunca pisa un nombre puesto a mano. |
| [**pi-claude-bridge**](https://github.com/elidickinson/pi-claude-bridge)          | GitHub (elidickinson)    | Puente a Claude Code (Agent SDK): modelos `claude-bridge/*` en `/model` y tool `AskClaude`.         |

#### Proveedores y modelos

| Paquete                                                                                        | Repo               | ¿Qué hace?                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [**pi-provider-opencode-console**](https://github.com/grikomsn/pi-provider-opencode-console)   | GitHub (grikomsn)  | Proveedores `opencode-console` y `opencode-go-console` con login OAuth por device-code y descubrimiento de modelos por organización. Es el `defaultProvider` de esta config (`opencode-go-console`, modelo `deepseek-v4.1-flash`). |

#### Utilidades

| Paquete                                                                      | Repo                  | ¿Qué hace?                                                                                                                 |
| ---------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [**pi-head**](https://github.com/omerxx/pi-head)                             | GitHub (omerxx)       | Resumen de una línea al reenfocar el terminal tras inactividad. Ayuda con múltiples sesiones.                              |
| [**pi-context-prune**](https://github.com/championswimmer/pi-context-prune)  | GitHub (championswimmer) | Resume batches de tool calls completados y poda los outputs crudos del contexto futuro. Recuperables vía `context_tree_query`. |
| [**pi-ask-user**](https://github.com/nicobailon/pi-ask-user)                 | GitHub (nicobailon)   | Herramienta `ask_user` para preguntas estructuradas al agente con overlay interactivo, opciones múltiples y entrada libre. |
| [**@ogulcancelik/pi-sketch**](https://github.com/ogulcancelik/pi-extensions) | GitHub (ogulcancelik) | Dibujo y bocetos desde Pi en el terminal.                                                                                  |
| [**@diegopetrucci/pi-librarian**](https://www.npmjs.com/package/@diegopetrucci/pi-librarian) | npm | Investigación en GitHub con caché local de repos. Búsqueda web con evidencias y citas de código.                            |
| [**@badliveware/pi-pr-upstream-status**](https://www.npmjs.com/package/@badliveware/pi-pr-upstream-status) | npm | Muestra el estado del PR upstream de la rama actual (abierto, mergeado, cerrado).                                            |
| [**@mazli/pi-worktree**](https://github.com/HamdiMaz/Worktree)                   | GitHub (HamdiMaz)      | Crea y gestiona git worktrees desde Pi. `/worktree <rama>` abre una sesión aislada en `.worktrees/`, creando la rama y copiando recursos `.pi` automáticamente. |
| [**@nikiforovall/pi-scratchpad**](https://github.com/NikiforovAll/scratchpad) | GitHub (NikiforovAll) | Scratchpad por sesión sobre el CLI `scratch`: skills `scratch` y `planning-with-scratchpad`, más `/scratch ui/export/stop` para el visor de solo lectura. |
| [**@miclivs/pi-charts**](https://www.npmjs.com/package/@miclivs/pi-charts) | npm | Renderiza gráficos ECharts a PNG inline: tools `chart_schema` y `render_chart` (bar, line, pie, scatter, radar, funnel, gauge, treemap, boxplot, heatmap, candlestick, sankey). |

## Tools

Scripts propios en `tools/`. Sin dependencias, ESM, solo builtins de `node:`.

| Tool         | Qué hace                                                       |
| ------------ | -------------------------------------------------------------- |
| **pi-usage** | Coste, tokens y turnos de `sessions/` por proyecto, modelo y día. |

Uso: `node tools/pi-usage/cli.js ~/.pi/agent/sessions --top 5`, con `--json` para datos crudos. Módulos `parse` → `aggregate` → `render` → `cli` con contratos congelados, y tests en `tools/pi-usage/tests/quickcheck.js`.

Nota: los JSONL de origen traen correcciones de precio negativas (dos ficheros suman −$119k), así que el total puede salir negativo. Se propaga tal cual, no se recorta.

## Workflows

`workflows/wave.js` — runner de waves paralelas para [pi-subagents](https://github.com/nicobailon/pi-subagents): cola de listos sobre un task graph leído de un plan, un reintento por tarea con el error en el prompt, propagación de skips a los dependientes y review final fresco.

```js
subagent({
  workflow: "./workflows/wave.js",
  cwd: "/home/pcaro/.pi/agent",
  args: {
    plan: "~/.pi/history/<project>/plans/<plan>.md",
    tasks: [{ id: "T1", agent: "worker", files: "ruta/a.js", deps: [] }],
    review: { agent: "reviewer", model: "opencode/claude-haiku-5-5", timeoutMs: 180000 },
  },
})
```

Validar antes de lanzar: `subagent({ action: "validate", workflow: "./workflows/wave.js" })`.

El hijo no recibe el texto de la tarea, solo la ruta del plan y su id: cada uno lee su bloque, y el plan es la fuente única. `model` y `timeoutMs` son pass-through — el script nunca elige modelo. Los `workflows/*.json` siguen siendo estado de runtime y no se versionan.

## Themes

Custom themes located in `themes/` (currently `notte.json`).

## Commands

Custom prompt templates located in `prompts/` (`conjetura`, `critica`, `listo`, `pr-arregla`, `pr-crea`, `revisa-sesion`).

---

This config uses subagents (folder `agents/`) via [pi-subagents](https://github.com/nicobailon/pi-subagents), plus custom main-agent modes in `main-agents/` (`ask`, `design`, `fast`, `nico`, `plan`, `raw`).
