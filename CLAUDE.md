# Instrucciones para Claude

## Delegar el código en Codex (por defecto)

El usuario quiere que **Codex escriba el código y Claude lo revise**. Para cualquier tarea
de código (implementar, corregir bugs, refactorizar, escribir tests):

1. Usa el skill `codex` (`.claude/skills/codex/SKILL.md`): redacta un prompt completo y
   delega la tarea con `codex exec`, usando la suscripción de ChatGPT del usuario
   (nunca una API key).
2. Revisa lo que hizo Codex: `git diff`, tests y build. Si hay errores, pídele a Codex que
   los corrija (`codex exec resume --last`) o corrígelos tú, y di cuál de las dos cosas hiciste.
3. Informa al usuario: qué le pediste a Codex, qué cambió y el resultado de la revisión.

Si Codex no está instalado o no tiene sesión iniciada, sigue el paso 1 del skill (en la nube:
`codex login --device-auth` y darle al usuario el código). Si el usuario pide expresamente
que lo hagas tú, no delegues.
