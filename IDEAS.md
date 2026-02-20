# Future Ideas & Extensions

Este documento recopila ideas y extensiones interesantes encontradas en otros repositorios (principalmente [agent-stuff de mitsuhiko](https://github.com/mitsuhiko/agent-stuff)) que podrían ser útiles en el futuro.

## 1. Session Control (`control.ts`)

**Referencia:** [pi-extensions/control.ts](https://github.com/mitsuhiko/agent-stuff/blob/main/pi-extensions/control.ts)

**Descripción:**
Una extensión de control de sesión que permite la comunicación entre diferentes instancias (sesiones) de `pi` mediante sockets de dominio Unix. Convierte a `pi` en un sistema capaz de tener múltiples agentes colaborando o ser controlado externamente por scripts.

**Funcionalidades principales:**
- **Comunicación entre agentes:** Permite que una sesión envíe mensajes a otra.
- **Control externo/Scripting:** Permite enviar comandos a una sesión activa desde la terminal.
- **Gestión remota:** Obtener el último mensaje, pedir resúmenes, reiniciar sesiones (rewind).
- **Tooling:** Añade la herramienta `send_to_session` para que la AI pueda invocar a otros agentes.

**Ejemplo de uso:**

1.  **Iniciar sesión receptora ("servidor"):**
    ```bash
    # Inicia pi con control habilitado
    pi --session-control
    # Dentro de pi: /name worker-db
    ```

2.  **Enviar órdenes desde terminal:**
    ```bash
    pi -p --session-control \
       --control-session worker-db \
       --send-session-message "Ejecuta el script de migración y avísame si falla"
    ```

3.  **Uso desde la AI (Agente a Agente):**
    > "Pregunta a la sesión 'investigador' si ha encontrado la librería que necesitamos."
    
    (La AI usará `send_to_session` para comunicarse).

---

## 2. Prompt Editor Modes (`prompt-editor.ts`)

**Referencia:** [pi-extensions/prompt-editor.ts](https://github.com/mitsuhiko/agent-stuff/blob/main/pi-extensions/prompt-editor.ts)

**Descripción:**
Implementa un sistema de "modos" para el editor de prompts en la TUI. Permite guardar y cambiar rápidamente entre configuraciones predefinidas de modelos y niveles de razonamiento (thinking).

**Funcionalidades principales:**
- **Perfiles (Modos):** Guarda configuraciones (Proveedor + Modelo + Thinking Level) con nombres cortos (ej: `fast`, `arch`).
- **Cambio Rápido:** Comandos `/mode <nombre>` o atajos de teclado (`Ctrl+Shift+M` seleccionar, `Ctrl+Espacio` ciclar).
- **Indicador Visual:** Cambia el borde del editor de texto para indicar el modo actual.
- **Persistencia:** Guarda las configuraciones en un `modes.json`.

**Ejemplo de uso:**

1.  **Configuración:**
    - Modo `fast`: Claude Haiku (sin thinking).
    - Modo `arch`: Claude Sonnet 3.7 (High Thinking).

2.  **Flujo de trabajo:**
    - Para dudas rápidas: `Ctrl+Space` hasta llegar a `fast` o escribir `/mode fast`.
    - Para diseño complejo: `/mode arch`.
    - El borde del editor cambia de color/etiqueta para reflejar el modo.
