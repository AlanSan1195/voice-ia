# Vera API

API hexagonal para Vera, la simuladora de entrevistas técnicas en inglés.

## Desarrollo

Requiere Bun `1.3.14` y pnpm `11`.

```sh
cp .env.example .env
pnpm install
pnpm --filter @voice-ia/api dev
```

La API escucha en `http://localhost:3001`. Configura al menos una de estas claves:

```sh
GROQ_API_KEY=...
CEREBRAS_API_KEY=...
```

Groq se intenta primero y Cerebras actúa como fallback ante errores, timeout o JSON inválido. Para voz, ElevenLabs `eleven_v3` es la primera opción cuando existe `ELEVENLABS_API_KEY`; después se usa Groq Orpheus y, finalmente, la voz local del navegador.

## Capas

- `src/domain`: tipos y reglas del dominio.
- `src/application`: puertos y casos de uso.
- `src/infrastructure`: proveedores de IA, PDF, audio y HTTP.
- `index.ts`: composición de dependencias y servidor Bun.

El historial de entrevistas vive en el navegador; la API no persiste CVs, audio ni respuestas.
