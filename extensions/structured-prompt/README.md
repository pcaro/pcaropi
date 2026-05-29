# Structured Prompt

Extensión de Pi que abre un formulario estructurado para componer prompts en secciones.

Copiada de [n-r-w/pi-agent-suite](https://github.com/n-r-w/pi-agent-suite/tree/main/pi-package/extensions/structured-prompt) el 2026-05-23.

## Uso

- **Atajo**: `Ctrl+Alt+P`
- **Comando**: `/prompt`

El formulario tiene 6 secciones editables:

- **Goal** — objetivo general
- **Task** — tarea concreta a realizar
- **Context** — contexto relevante
- **Criteria** — criterios de éxito
- **Constraints** — restricciones o límites
- **Work order** — orden de trabajo o pasos

Cada sección se edita en un editor multilínea. `Enter` avanza a la siguiente sección, `Shift+Enter` inserta un salto de línea.

Al terminar todas las secciones se muestra una **pantalla de revisión** donde podés:

- **Enter** — enviar el prompt al agente
- **Ctrl+T** — colocar el prompt en el input actual
- **Ctrl+Y** — copiar al portapapeles
- **Esc** — cancelar

Si el agente está ocupado, pregunta si querés encolar el prompt como follow-up.

## Configuración

La extensión se puede desactivar creando `~/.pi/agent/agent-suite/structured-prompt/config.json`:

```json
{ "enabled": false }
```

Por defecto está habilitada (`enabled: true`).

## Autocompletado de archivos

Si tenés [`fd`](https://github.com/sharkdp/fd) instalado y en el PATH, podés usar `@` en los campos del formulario para autocompletar rutas del proyecto.
