# Vera · interview lab

MVP para practicar entrevistas técnicas en inglés con una interfaz Astro/React y una API Bun con fallback entre Groq y Cerebras.

## Requisitos

- Bun `1.3.14`
- pnpm `11`
- Claves `GROQ_API_KEY` y/o `CEREBRAS_API_KEY`

## Arranque

```sh
pnpm install
cp bun-tool-IA/api/.env.example bun-tool-IA/api/.env
pnpm dev
```

- Web: `http://localhost:4321`
- API: `http://localhost:3001`

La interfaz permite usar una descripción de puesto, un CV PDF/TXT/Markdown o ambos. Las preguntas se reproducen con ElevenLabs v3, Groq Orpheus o la voz del navegador según las claves disponibles; las respuestas se graban y se transcriben con Groq Whisper. El historial se guarda localmente y se puede exportar.

## Verificación

```sh
pnpm --filter @voice-ia/api typecheck
pnpm --filter @voice-ia/web typecheck
pnpm --filter @voice-ia/web build
```

TypeScript 7 no es compatible todavía con la API programática de `astro check`, por eso el typecheck de la web usa `tsc --noEmit`; el build de Astro 7 sí se ejecuta normalmente.
