---
name: codex
description: Delegar tareas al Codex del usuario (Codex CLI con su suscripción de ChatGPT) como si fuera un subagente. Usar cuando el usuario diga "usa Codex", "delégalo a Codex", "que lo haga Codex", "pídele a Codex", o invoque /codex. Claude redacta el prompt, ejecuta `codex exec`, lee el resultado y verifica el trabajo antes de reportarlo.
---

# Delegar en Codex

El usuario quiere darte un prompt y que tú se lo delegues a **su** Codex, usando su
suscripción de ChatGPT (nunca una API key). Tú eres quien orquesta: redactas el prompt,
lanzas Codex, revisas lo que hizo y le informas al usuario.

> `codex mcp-server` ya no existe en versiones actuales de la CLI. No intentes
> registrar Codex como servidor MCP: usa `codex exec`.

## 1. Comprobar que Codex está listo

```bash
codex --version || npm i -g @openai/codex
codex login status
```

- Si **no hay sesión**:
  - En una sesión en la nube (sin navegador): ejecuta `codex login --device-auth`
    **en segundo plano** redirigiendo la salida a un archivo del scratchpad, lee el
    archivo y dale al usuario el enlace (`https://auth.openai.com/codex/device`) y el
    código de un solo uso. Espera a que el proceso termine antes de seguir.
  - En la Mac del usuario: pídele que ejecute `codex login` y elija
    **"Sign in with ChatGPT"**.
- Nunca configures `OPENAI_API_KEY` ni uses `--with-api-key`: el usuario quiere que se
  cobre a su suscripción.
- Si la red bloquea `auth.openai.com` o `chatgpt.com` (403 del proxy), esos hosts deben
  estar permitidos en el entorno.

## 2. Redactar el prompt para Codex

Codex no ve esta conversación. El prompt debe ser autosuficiente:

- **Objetivo**: qué hay que lograr, en una o dos frases.
- **Contexto**: archivos relevantes (rutas), decisiones ya tomadas, restricciones.
- **Alcance**: qué puede tocar y qué no (p. ej. "no cambies la API pública").
- **Criterio de terminado**: tests o comandos que deben pasar.
- **Formato de respuesta**: pide un resumen final breve de lo que cambió y por qué.

Escribe el prompt en un archivo del scratchpad (evita problemas de comillas) y pásalo
por stdin.

## 3. Ejecutar

Elige el sandbox según la tarea:

| Tarea                                   | Sandbox            |
|-----------------------------------------|--------------------|
| Revisar, explicar, analizar, opinar     | `read-only`        |
| Editar código, escribir tests, refactor | `workspace-write`  |

```bash
codex exec \
  --sandbox workspace-write \
  --cd "$(git rev-parse --show-toplevel)" \
  --color never \
  -o "$SCRATCH/codex-last.md" \
  - < "$SCRATCH/codex-prompt.md" > "$SCRATCH/codex-log.txt" 2>&1
```

- Para tareas largas, ejecútalo en segundo plano y espera la notificación.
- Para revisiones de código existe también `codex exec review`.
- Si el sandbox `workspace-write` falla dentro de un contenedor ya aislado (sesión en la
  nube), informa al usuario antes de usar
  `--dangerously-bypass-approvals-and-sandbox`; nunca lo uses en la Mac del usuario.
- Para seguir la misma conversación con Codex (correcciones):
  `codex exec resume --last "<instrucción>"`.

## 4. Verificar y reportar

No reportes el trabajo de Codex como hecho sin revisarlo:

1. Lee `codex-last.md` (su resumen final).
2. Revisa `git status` y `git diff` para ver qué cambió realmente.
3. Ejecuta los tests o comandos del criterio de terminado.
4. Si algo está mal, pídele a Codex que lo corrija (`resume --last`) o corrígelo tú, y
   di cuál de las dos cosas hiciste.

Al usuario dale: qué le pediste a Codex (resumen), qué hizo, el resultado de la
verificación, y cualquier cosa que haya quedado pendiente.
