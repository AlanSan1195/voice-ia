# Mejora educativa del feedback de Vera

> **Estado:** pasos 1 y 2 implementados; pasos 3–5 pendientes. La tarjeta visual todavía no cambia. Basado en el proyecto en el commit `d41aa1b` (19 de septiembre de 2026).

Vera ya ayuda a practicar entrevistas técnicas en inglés. La siguiente mejora debe lograr que, después de cada respuesta, la persona sepa **qué hizo bien, qué cambiaría y cómo practicarlo**. El feedback seguirá siendo honesto y específico para el puesto y el nivel de inglés, sin convertir la entrevista de tres preguntas en un examen más largo.

## Camino corto

1. **Completado:** fijar la regla pedagógica y los ejemplos de referencia (paso 1).
2. **Completado:** enriquecer el feedback que ya genera la IA, sin llamadas adicionales (paso 2).
3. Mostrar una comparación útil y un mini-reto opcional por respuesta (paso 3).
4. Cerrar la sesión con una prioridad de práctica respaldada por los turnos (paso 4).
5. Validar calidad, accesibilidad y compatibilidad antes de considerar nuevas funciones (paso 5).

## Punto de partida

- La entrevista tiene tres preguntas; cada turno recibe puntuaciones, feedback en español, una respuesta corregida y otra adaptada al siguiente nivel. Véanse `bun-tool-IA/api/src/application/use-cases/interview.ts`, `bun-tool-IA/api/src/infrastructure/ai/prompts.ts` y `bun-tool-IA/api/src/application/scoring/interview-scoring.ts`.
- `apps/web/src/components/TurnEvaluationCard.tsx` presenta esas piezas como métricas y bloques de texto. No identifica dentro de la respuesta qué expresión cambió ni transforma la corrección en una acción breve.
- `apps/web/src/components/ResultsStage.tsx` muestra fortalezas, brechas, recomendaciones y revisión por turno, pero no conecta una prioridad de práctica con la evidencia de los tres turnos.
- El historial se guarda localmente y migra sesiones anteriores en `apps/web/src/components/InterviewApp.history.ts`. El plan debe conservar su lectura y exportación.

La oportunidad no es añadir más puntuaciones: es crear un ciclo **respuesta → evidencia → mejora → práctica opcional → siguiente pregunta**. Las puntuaciones actuales siguen disponibles, pero dejan de ser la primera cosa que se lee.

## Experiencia objetivo

Para la pregunta «How did you improve API performance?» y la respuesta «I make API faster with cache», el feedback podría verse así:

| Momento               | Contenido mostrado                                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Lo que funcionó       | «Mencionaste una acción técnica concreta: usar caché».                                                                      |
| Corrige en contexto   | `make → made`; `with cache → by adding a cache`. Respuesta corregida: «I made the API faster by adding a cache».            |
| Por qué importa       | «La pregunta pide una experiencia pasada; el verbo en pasado hace la respuesta más clara».                                  |
| Técnica útil          | «Acción + decisión + evidencia real»: explica qué cambiaste y, **si tienes el dato**, cómo comprobaste el efecto.           |
| Prueba de 30 segundos | «Reescribe tu respuesta añadiendo cómo mediste la mejora, solo si lo hiciste». Botones: «Practicar» y «Siguiente pregunta». |

El mini-reto sirve para ensayar, no para obtener otra nota. No debe inventar métricas, logros, conocimientos técnicos ni problemas de pronunciación a partir de una transcripción. Si el inglés ya es correcto, se muestra un uso acertado o un refinamiento opcional; no se fabrica un error para llenar la tarjeta.

## Reglas de producto y contenido

- **Dos focos como máximo por turno:** una observación de inglés y una de entrevista/contenido técnico. Cada una debe referirse a la respuesta real. Mantener el coaching en español y las propuestas de respuesta en inglés.
- **Una habilidad prioritaria, no una colección de “hacks”:** usar las dimensiones existentes —inglés, técnico, relevancia y estructura— para nombrar la habilidad trabajada. Técnicas como STAR, PREP o «acción + motivo + resultado comprobable» se ofrecen solo cuando encajan con la pregunta. Evitar frases memorizadas que oculten la experiencia propia.
- **Ayuda progresiva:** primero la observación accionable; después la explicación, el ejemplo de siguiente nivel y las puntuaciones. En móvil, el siguiente paso debe seguir siendo fácil de encontrar.
- **Evidencia antes que apariencia:** marcar una palabra o frase únicamente si se encuentra de forma inequívoca en la respuesta original. Si no coincide, mostrar la comparación de frases sin resaltado; nunca marcar texto inventado.
- **Privacidad y ritmo:** el texto del mini-reto vive solo durante el turno, no se guarda en el historial ni se envía a otra evaluación. «Siguiente pregunta» permanece disponible sin practicar.

## Plan de implementación

### Paso 1 — Fijar la pauta pedagógica

**Resultado visible:** una pauta breve de contenido y tres ejemplos de referencia (A1/A2, B1 y B2) que muestren tono, nivel de corrección y una técnica apropiada para una entrevista técnica.

**Trabajo:** preparar ejemplos con respuesta original, observación de inglés, mejora de entrevista, corrección que preserve los hechos y mini-reto de unos 30 segundos. Definir también un caso sin error gramatical claro y otro sin dato medible; en ambos, el feedback debe evitar inventar problemas o cifras. Revisar que las técnicas recomendadas ayuden a responder la pregunta específica.

**Depende de:** nada. Esta pauta fija el contrato de contenido de los siguientes pasos.

**Terminado cuando:** cada ejemplo permite identificar una fortaleza real, una mejora prioritaria y una práctica posible sin información fabricada. Los ejemplos quedan como casos de prueba para prompts y pantallas. **Estado actual: completado en este documento.**

**Verificación:** revisar los tres ejemplos contra las reglas de producto anteriores; ninguno debe atribuir resultados, cifras o errores de pronunciación no observados.

#### Pauta pedagógica v1

El feedback de cada turno seguirá esta secuencia, en este orden:

1. **Reconocer una evidencia:** citar una decisión, idea o expresión que sí aparece en la respuesta.
2. **Elegir una sola mejora prioritaria:** escoger el cambio con más impacto para el nivel y la pregunta; no corregir todo a la vez.
3. **Mostrar el cambio en contexto:** conservar la idea y los hechos de la persona; separar la corrección de inglés de la mejora de entrevista.
4. **Explicar el motivo en una frase:** usar español claro y evitar etiquetas gramaticales si no ayudan a actuar.
5. **Proponer una práctica opcional:** un reto de unos 30 segundos que se pueda saltar y que no genere una nueva nota.

| Regla        | Aplicación concreta                                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Realista     | Solo se corrige lo que está en la transcripción; no se inventan métricas, logros, pronunciación ni contexto.                  |
| Prioritaria  | Máximo una mejora de inglés y una de entrevista por turno.                                                                    |
| Gradual      | A1/A2 recibe frases cortas y vocabulario frecuente; B1 recibe estructura y precisión; B2 recibe matiz, evidencia y concisión. |
| Transferible | STAR, PREP o «acción + motivo + resultado» aparecen como herramientas para esa pregunta, no como respuestas para memorizar.   |
| Motivadora   | Primero se reconoce lo que funciona; la puntuación queda después de la explicación accionable.                                |

#### Casos de referencia

##### Caso A — A1/A2: corregir una forma verbal sin sobrecargar

- **Pregunta:** “Tell me about a bug you fixed.”
- **Respuesta original:** “I fix bugs and talk with team.”
- **Lo que funciona:** La persona comunica dos acciones relevantes: resolver errores y colaborar.
- **Mejora de inglés:** `fix → fixed` y `talk → talked`; la pregunta pide una experiencia pasada.
- **Respuesta corregida:** “I fixed bugs and talked with my team.”
- **Mejora de entrevista:** Añadir qué problema resolvió, solo si puede describirlo con hechos.
- **Técnica:** «Acción + contexto»; una frase para lo que hizo y otra para explicar el problema.
- **Mini-reto opcional:** “Say one more short sentence about the bug. Do not add a result you do not know.”
- **Límite:** No pedir vocabulario avanzado ni una respuesta STAR completa a este nivel.

##### Caso B — B1: mejorar estructura sin inventar un resultado

- **Pregunta:** “Why did you change the database query?”
- **Respuesta original:** “I changed the query because users waited. I used an index and it was faster.”
- **Lo que funciona:** Explica una causa y una decisión técnica concreta.
- **Mejora de inglés:** No hay un error prioritario que corregir; mantener el lenguaje comprensible.
- **Respuesta corregida:** “I changed the query because users were waiting. I added an index, and the query became faster.”
- **Mejora de entrevista:** Separar problema, acción y resultado observado; no convertir «faster» en una cifra.
- **Técnica:** STAR en versión corta: situación/problema → acción → resultado conocido.
- **Mini-reto opcional:** “Rewrite the answer with one sentence for the problem, one for the action, and one for the result you actually observed.”
- **Límite:** No sugerir «30% faster» ni otra métrica si la respuesta no la proporciona.

##### Caso C — B2: reconocer un inglés correcto y afinar evidencia

- **Pregunta:** “How did you improve API performance?”
- **Respuesta original:** “I introduced caching after profiling the endpoint, which reduced repeated database reads. I monitored latency after the release.”
- **Lo que funciona:** La respuesta es clara, profesional y conecta diagnóstico, decisión y verificación.
- **Mejora de inglés:** No marcar una palabra como error; ofrecer solo un refinamiento opcional de concisión.
- **Respuesta corregida:** “I introduced caching after profiling the endpoint. It reduced repeated database reads, and I monitored latency after the release.”
- **Mejora de entrevista:** Si existe el dato real, añadir cómo cambió la latencia; si no existe, la respuesta ya es suficiente.
- **Técnica:** «Decisión → evidencia → comprobación»; priorizar evidencia observable sobre adjetivos.
- **Mini-reto opcional:** “Give the same answer in 30 seconds, adding one real measurement only if you have it.”
- **Límite:** No fabricar una cifra, un porcentaje ni una afirmación de impacto.

Estos casos se convierten en fixtures de los pasos 2 y 3: deben conservar la separación entre coaching en español, ejemplos en inglés y hechos aportados por la persona. Si una futura salida de IA no puede satisfacer esa separación, se degrada al feedback actual en lugar de completar el texto con suposiciones.

### Paso 2 — Añadir coaching estructurado al turno

**Resultado visible:** `POST /api/interviews/evaluate-turn` devuelve sus campos actuales y, cuando la IA aporta datos válidos, un bloque opcional `coaching`. No cambia ningún cálculo de puntuación ni se añade una llamada a la IA.

**Trabajo:** ampliar el prompt de evaluación, los esquemas de validación y los tipos de API/web. El bloque propuesto contiene:

```ts
coaching?: {
  language?: {
    original: string; // Fragmento literal de la respuesta, si hay corrección real.
    replacement: string; // Fragmento alternativo en inglés.
    why: string; // Explicación breve en español.
  };
  interview: {
    skill: "technical" | "relevance" | "structure";
    evidence?: string; // Fragmento literal, si puede comprobarse.
    technique: string; // Técnica contextual, no fórmula obligatoria.
    action: string; // Qué mejoraría esta respuesta.
    miniChallenge: string; // Práctica opcional y no evaluada.
  };
};
```

Los campos obligatorios actuales de la evaluación siguen siendo estrictos. Validar el nuevo bloque por separado: si es inválido, descartarlo sin perder puntuaciones, `feedback`, `correctedAnswer` ni `nextLevelAnswer`. Antes de devolverlo, comprobar que `original` y `evidence`, cuando existan, sean citas localizables de forma única en `answer`; si fallan, retirar solo el marcado asociado. Limitar la longitud de los textos para que el feedback siga siendo escaneable. Mantener el fallback entre Groq y Cerebras y una sola petición por evaluación.

Actualizar la migración del historial para conservar `coaching` válido en sesiones nuevas y aceptar las sesiones antiguas sin ese campo, sin cambiar la clave de almacenamiento por una adición compatible. Crear `apps/web/src/components/InterviewApp.history.test.ts` para cubrir ambas formas de sesión.

**Depende de:** paso 1.

**Terminado cuando:** un resultado válido conserva exactamente las puntuaciones actuales y añade coaching; una respuesta sin coaching o con coaching malformado sigue mostrando el feedback anterior; una cita inexistente nunca se marca. Las pruebas de evaluación, proveedores e historial cubren esos casos. **Estado actual: completado.** **Verificación:** `pnpm --filter @voice-ia/api test`, `pnpm --filter @voice-ia/api typecheck`, `pnpm --filter @voice-ia/web typecheck` y `pnpm exec bun test apps/web/src/components/InterviewApp.history.test.ts` terminan sin errores.

### Paso 3 — Convertir la tarjeta de turno en una ayuda para actuar

**Resultado visible:** `TurnEvaluationCard` abre con «Lo que funcionó» y «Qué cambiaría». Presenta original y corrección con etiquetas explícitas y resaltado de diferencias verificadas; las métricas quedan en un nivel secundario. La persona puede hacer o saltar el mini-reto antes de continuar.

**Trabajo:** usar texto de React y elementos semánticos como `<del>` y `<ins>` para el cambio, nunca HTML generado por el modelo. La comparación debe seguir siendo comprensible sin color, con teclado y lector de pantalla. Si falta `coaching`, conservar una presentación clara de los campos existentes. El mini-reto puede abrir una caja de texto local y cerrarse sin afectar la respuesta evaluada, las puntuaciones o la siguiente pregunta. Mantener la identidad visual actual y respetar movimiento reducido.

**Depende de:** paso 2.

**Terminado cuando:** el usuario puede señalar el cambio concreto y explicar por qué importa, o continuar sin practicar. La tarjeta funciona con texto corto/largo, en móvil y con teclado; no se guarda ni califica el intento. **Verificación:** `pnpm --filter @voice-ia/web typecheck` y revisión manual de los estados con/sin coaching.

### Paso 4 — Dar un siguiente paso útil al cerrar la sesión

**Resultado visible:** `ResultsStage` resume una prioridad de práctica, muestra a qué turno(s) se refiere y propone una acción breve para la próxima entrevista. Las recomendaciones y la revisión por turno siguen accesibles.

**Trabajo:** aprovechar la llamada final de feedback para devolver opcionalmente `nextPractice`:

```ts
nextPractice?: {
  skill: "english" | "technical" | "relevance" | "structure";
  observation: string;
  turnIndices: number[]; // Índices únicos y válidos entre 0 y 2.
  action: string;
  miniChallenge: string;
};
```

Presentarlo como «patrón» solo si está respaldado por al menos dos turnos; con uno, llamarlo «prioridad de práctica». Enlazar la evidencia a las respuestas originales. Validar el bloque opcional por separado del resumen obligatorio. Si falta o no supera la validación, usar el resumen y las recomendaciones actuales. Los archivos de historial anteriores deben abrirse sin pérdida de contenido.

**Depende de:** pasos 2 y 3.

**Terminado cuando:** el cierre ofrece una acción específica sin repetir tres bloques genéricos; las referencias apuntan a turnos reales y las sesiones antiguas se muestran correctamente. **Verificación:** `pnpm --filter @voice-ia/api test`, `pnpm exec bun test apps/web/src/components/InterviewApp.history.test.ts` y `pnpm --filter @voice-ia/web typecheck` terminan sin errores.

### Paso 5 — Probar la utilidad antes de ampliar el producto

**Resultado visible:** una entrega validada del flujo completo, con incidencias pedagógicas y de interfaz corregidas antes de proponer seguimiento de habilidades entre sesiones.

**Trabajo:** recorrer una entrevista completa para A1/A2, B1 y B2; incluir un turno sin corrección, uno con salida parcial de IA y una sesión antigua. Añadir pruebas de historial y de la selección/resaltado de fragmentos como funciones puras, incorporándolas al comando `pnpm verify` (hoy solo ejecuta las pruebas de la API). Revisar escritorio y móvil, teclado, lector de pantalla, esperas y errores de red. Comprobar con personas de prueba que pueden responder «¿qué cambiarías en tu próxima respuesta?» después de ver la tarjeta, sin tener que interpretar la puntuación. Registrar resultados manualmente; no añadir telemetría ni cuentas en esta fase.

**Depende de:** pasos 1–4.

**Terminado cuando:** ninguna caída del coaching bloquea la entrevista, el historial anterior sigue legible, los cambios se distinguen sin color y el siguiente paso resulta comprensible en la revisión de uso. **Verificación:** `pnpm verify` termina sin errores y la lista manual de escenarios queda revisada.

## Límites y decisiones para la ejecución

- La primera entrega funcional comprende los pasos 1–4. El paso 5 es su puerta de salida; el seguimiento de habilidades entre sesiones es posterior y **no** forma parte de esta entrega.
- No añadir endpoint, evaluación adicional, nota para el mini-reto, análisis de pronunciación, audio persistido, cuentas ni almacenamiento remoto.
- No debilitar los esquemas de puntuación para aceptar una salida de IA defectuosa. El coaching enriquecido se degrada por separado al feedback ya existente.
- Si un cambio de contrato impide abrir sesiones previas o aumenta las llamadas de IA por turno, detener esa implementación y resolver la compatibilidad/coste antes de continuar.

## Comprobación de este documento

- [ ] Cada paso declara resultado visible, dependencia, criterio de finalización y verificación.
- [x] Paso 1 incluye la pauta pedagógica v1 y los casos A1/A2, B1 y B2.
- [x] Paso 2 añade coaching opcional, sanitiza citas y conserva sesiones antiguas.
- [ ] El ejemplo muestra una corrección concreta y evita inventar evidencia.
- [ ] El plan conserva el flujo de tres preguntas, el historial local y las puntuaciones deterministas.
- [ ] `pnpm exec prettier --check MEJORAEDUCATIVA.md` termina sin errores.
