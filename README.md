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

| Skill                                   | When to use                                                    | Tools            | Scripts/Files                                             |
| --------------------------------------- | -------------------------------------------------------------- | ---------------- | --------------------------------------------------------- |
| **[show-me](skills/show-me/README.md)** | Prove that code works — run demos, record terminal sessions    | Bash, Read       | `scripts/kitty_screenshot.sh`, `scripts/wait_for_text.sh` |
| **summarize**                           | Convert URL/PDF/DOCX to Markdown, summarize content            | Bash, Read       | `to-markdown.mjs`                                         |
| **google-workspace**                    | Access Drive, Docs, Calendar, Gmail, Sheets without MCP        | Bash             | `scripts/auth.js`, `scripts/workspace.js`                 |
| **github**                              | Interact with GitHub — PRs, issues, CI runs, API queries       | Bash             | `gh` CLI                                                  |
| **web-browser**                         | Interact with web pages — click, fill forms, navigate          | Bash             | `scripts/*.js` (CDP)                                      |
| **cli-tools**                           | Reference for selecting tools — jq, fx, gh, sqlite-utils, etc. | (reference only) | —                                                         |
| **update-changelog**                    | Update CHANGELOG.md before releases                            | (reference only) | —                                                         |
| **brainstorming-requirement**           | Refine ideas into designs through structured questioning       | ask_user, write  | —                                                         |

#### Quick Reference

- **Recording demos**: Use `show-me` to prove code works
- **Data extraction**: Use `summarize` for docs, `cli-tools` for JSON
- **GitHub ops**: Use `github` for PRs, issues, CI
- **Web automation**: Use `web-browser` for browser interaction
- **Google Workspace**: Use `google-workspace` for Drive/Docs/Calendar
- **Requirements**: Use `brainstorming-requirement` before coding

## Extensions

### Internas (en este repo `pi-extensions/`)

| Extensión             | Archivo                | ¿Qué hace?                                                                                                                                        |
| --------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **answer**            | `answer.ts`            | Q&A interactivo. Extrae preguntas de mensajes del asistente y las responde una por una (`/answer` o `Ctrl+.`).                                    |
| **context**           | `context.ts`           | Visualiza el uso actual de contexto (tokens, coste, archivos/skills cargados) vía `/context`.                                                     |
| **files**             | `files.ts`             | Explorador de archivos interactivo (`/files` o `Ctrl+Shift+o`) con estado git, vista rápida (`Ctrl+Shift+r`) y reveal en Finder (`Ctrl+Shift+f`). |
| **notify**            | `notify.ts`            | Notificaciones de escritorio (Linux/`notify-send`) cuando el agente completa un turno.                                                            |
| **session-breakdown** | `session-breakdown.ts` | Historial de sesiones (tokens/coste/mensajes) en 7/30/90 días vía `/session-breakdown`.                                                           |
| **todos**             | `todos.ts`             | Gestor de TODOs en Markdown (`/todos`). Listar, crear, asignar y actualizar tareas con bloqueo de archivos y TUI.                                 |
| **uv**                | `uv.ts`                | Intercepta comandos Python (`pip`, `poetry`) y redirige a `uv` para gestión de paquetes más rápida.                                               |

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
