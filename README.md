# ChichaLoL

Modo inicial `Perfil` para analizar cuentas de League of Legends.

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui style components

## Variables de entorno

Copiar `.env.example` a `.env.local` y completar:

- `RIOT_API_KEY`: development key de Riot
- `GEMINI_API_KEY`: API key de Gemini
- `GEMINI_MODEL`: opcional, por defecto `gemini-2.5-flash`

## Desarrollo

```bash
pnpm install
pnpm dev
```

Si falta `RIOT_API_KEY`, la app usa un perfil demo para no romper la experiencia.
