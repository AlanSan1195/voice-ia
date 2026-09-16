# Vera · interview lab

MVP para practicar entrevistas técnicas en inglés con una interfaz Astro/React y una API Bun con fallback entre Groq y Cerebras. El API requiere un código de acceso y limita el uso en memoria por sesión/IP.

## Requisitos

- Bun `1.3.14`
- pnpm `11`
- Claves `GROQ_API_KEY` y/o `CEREBRAS_API_KEY`
- `ACCESS_CODE_HASH` y `SESSION_SECRET` (genera el hash con `bun -e 'console.log(await Bun.password.hash("tu-codigo"))'`)

## Arranque

```sh
pnpm install
cp bun-tool-IA/api/.env.example bun-tool-IA/api/.env
pnpm dev
```

El código se verifica con `POST /api/access` y se guarda en una cookie `HttpOnly` de 12 horas. No se guardan cuentas ni datos remotos. El CV y respuestas se envían a los proveedores configurados solo para procesar la sesión: Groq/Cerebras reciben el contexto y ElevenLabs recibe el texto de cada pregunta para TTS. El historial permanece en `localStorage`; puedes borrarlo desde las herramientas de almacenamiento del navegador.

- Web: `http://localhost:4321`
- API: `http://localhost:3001`

La interfaz permite usar una descripción de puesto, un CV PDF/TXT/Markdown o ambos. Las preguntas se reproducen con ElevenLabs v3, Groq Orpheus o la voz del navegador según las claves disponibles; las respuestas se graban y se transcriben con Groq Whisper. El historial se guarda localmente y se puede exportar.

## Verificación

```sh
pnpm --filter @voice-ia/api typecheck
pnpm --filter @voice-ia/web typecheck
pnpm --filter @voice-ia/web build
pnpm verify
```

La API mantiene TypeScript 7 y la web usa TypeScript 6 para que `astro check` valide también los archivos `.astro`.
