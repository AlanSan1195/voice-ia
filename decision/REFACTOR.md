## Arquitectura del frontend

La interfaz está construida con Astro y React. `index.astro` monta el export
por defecto de `InterviewApp`, que funciona como coordinador de la sesión. La
interfaz visual está separada de la lógica de API, persistencia, audio y
transcripción para que cada cambio tenga un lugar claro.

```text
index.astro
    └── InterviewApp.tsx
          ├── InterviewApp.reducer.ts   estado puro del flujo
          ├── InterviewApp.types.ts     tipos compartidos
          ├── InterviewApp.history.ts   historial y progreso local
          ├── useQuestionSpeech.ts      TTS y reproducción
          ├── useAnswerRecorder.ts      micrófono y transcripción
          └── componentes visuales      pantallas y bloques de UI
```

### Responsabilidades

| Archivo                   | Responsabilidad                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `InterviewApp.tsx`        | Coordina autenticación, peticiones API, navegación, efectos y composición de pantallas.                     |
| `InterviewApp.reducer.ts` | Administra las transiciones del flujo sin hacer I/O ni efectos secundarios.                                 |
| `InterviewApp.types.ts`   | Contiene los modelos compartidos de etapas, sesiones, turnos, evaluaciones y progreso.                      |
| `InterviewApp.history.ts` | Lee, migra, deduplica, guarda, elimina y resume sesiones en `localStorage`.                                 |
| `useQuestionSpeech.ts`    | Gestiona TTS del proveedor remoto, fallback a `speechSynthesis`, progreso por palabras y limpieza de audio. |
| `useAnswerRecorder.ts`    | Gestiona permisos, `MediaRecorder`, tracks, timeout, transcripción y abortos.                               |
| `PrepareStage.tsx`        | Pantalla de preparación: puesto, nivel y carga de CV.                                                       |
| `InterviewStage.tsx`      | Pregunta activa, voz, respuesta, micrófono y evaluación.                                                    |
| `ResultsStage.tsx`        | Resultados, revisión por respuesta, exportación y eliminación.                                              |
| `ProgressOverview.tsx`    | Métricas y filtros del progreso histórico.                                                                  |
| `SessionHistory.tsx`      | Archivo local de sesiones y apertura de una sesión guardada.                                                |

## ¿Por qué existe `InterviewApp.history.ts`?

`InterviewApp.history.ts` no usa una extensión especial. La extensión real es
`.ts`; `history` es una convención en el nombre para indicar que el archivo
contiene la lógica de historial de `InterviewApp`. El punto permite agrupar
visualmente archivos relacionados:

```text
InterviewApp.history.ts
InterviewApp.reducer.ts
InterviewApp.types.ts
```

Se extrajo porque el historial tiene reglas propias y no necesita conocer el
estado de React ni hacer peticiones al backend. El módulo recibe sesiones y,
opcionalmente, un objeto `Storage`, por lo que puede trabajar con
`window.localStorage` en la aplicación y con un almacenamiento controlado en
verificaciones aisladas.

### Compatibilidad del historial

- Clave actual: `vera-interview-history-v2`.
- Clave migrada: `vera-interview-history-v1`.
- Las entradas inválidas se descartan sin romper la aplicación.
- Los datos antiguos se normalizan a los modelos actuales.
- Las sesiones se deduplican por `id`.
- Al guardar, se conserva un máximo de 20 sesiones.
- El borrado puede eliminar una sesión individual o todo el historial local.

El historial no se envía al backend. La pantalla de progreso recibe una lista
ya normalizada y `InterviewApp.history.ts` calcula promedios por nivel,
preparación laboral y dimensiones de evaluación.

## Flujo de estado

El estado principal usa un reducer discriminado. Las pantallas envían acciones
al coordinador y el reducer devuelve el siguiente estado de forma pura:

```text
Interacción de usuario
    └── handler de InterviewApp
          ├── dispatch(action)       cambio local inmediato
          └── petición API / efecto   trabajo asíncrono
                    └── dispatch(resultado o error)
```

Las operaciones importantes (`loading-cv`, `starting`, `evaluating` y
`advancing`) se representan en `operation`. El valor `busy` se deriva de esa
operación y del estado de transcripción, evitando que dos acciones de flujo se
ejecuten como si estuvieran libres al mismo tiempo.

El número de preguntas no se repite en la interfaz: se importa
`TOTAL_QUESTIONS` desde `@voice-ia/contracts`, que actualmente vale `3`.

## Audio y transcripción

### Pregunta y TTS

`useQuestionSpeech.ts` mantiene el proveedor actual (`streaming`, `system` u
`off`), el progreso de palabras y si Vera está hablando.

Cuando cambia la pregunta, se apaga la voz o se desmonta la pantalla:

1. Se aborta la petición TTS anterior.
2. Se invalida la generación anterior para ignorar callbacks tardíos.
3. Se pausa el audio activo.
4. Se revoca el `objectURL` asociado.
5. Se cancela `speechSynthesis` si se estaba usando el fallback.

Si el proveedor remoto falla o el navegador bloquea la reproducción, el hook
conserva el fallback a la voz del sistema y mantiene el resaltado por palabras.

### Respuesta y micrófono

`useAnswerRecorder.ts` encapsula `MediaRecorder` y expone:

- `listening`: si hay una grabación activa.
- `transcribing`: si el audio está siendo enviado a transcripción.
- `toggleRecording`: iniciar o detener la grabación.
- `cancelRecording`: cancelar completamente al reiniciar o salir.

Al detener se limpian los tracks del stream, el timeout y los fragmentos; al
cancelar también se aborta la petición de transcripción activa. Un token de
generación evita que un permiso de micrófono resuelto tarde vuelva a iniciar
una grabación después de un reinicio.

## Componentes visuales

Los componentes visuales reciben datos y callbacks por props. No realizan
peticiones, no escriben en `localStorage` y no administran la navegación global.
Esto mantiene intactos el diseño, las clases CSS y la estructura accesible,
pero permite modificar una pantalla sin recorrer toda la lógica de la sesión.

La extracción inicial también separó bloques grandes como:

- acceso privado;
- encabezado;
- preparación y `ReadySignal` (`className="signal"`);
- entrevista activa y tarjeta de evaluación;
- resultados y sesión incompleta;
- resumen de progreso;
- historial de sesiones.

No se crearon carpetas nuevas: todos los módulos permanecen como archivos
hermanos dentro de `apps/web/src/components`.

## Verificación después de cambios

Desde la raíz del proyecto:

```sh
pnpm exec prettier --check apps/web/src/components
pnpm --filter @voice-ia/web typecheck
pnpm --filter @voice-ia/web build
pnpm verify
```

`pnpm verify` ejecuta formato, typecheck de API y web, pruebas backend y build
de la web. Para cambios de flujo también conviene comprobar manualmente:

- acceso privado y errores de autenticación;
- carga, reemplazo rápido y arrastre de CV;
- activación/desactivación de voz durante una carga;
- cambio de pregunta sin audio anterior;
- grabación, rechazo de permisos y transcripción;
- evaluación, edición, resultados y exportación;
- filtros, apertura, eliminación y reinicio del historial.

## Alcance de esta arquitectura

Esta separación es estructural: no cambia endpoints, cuerpos de petición,
respuestas esperadas, clases CSS, textos ni el formato persistido. La
validación completa de contratos de respuesta del frontend y la incorporación
de pruebas frontend automatizadas quedan fuera del alcance actual.