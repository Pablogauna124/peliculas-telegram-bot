# Telegram Video Bot

Bot de Telegram en Node.js (sin dependencias externas, usa `fetch` nativo) que:

1. Recibe videos por long polling (`getUpdates`).
2. Obtiene el `file_id` y los metadatos con `getFile`.
3. Descarga el video a un archivo temporal.
4. Llama a `uploadToStorage()` (punto de extension para S3/R2/Supabase/etc.).
5. Responde con el enlace publico y borra el temporal.

## Estructura

```
bot/
  src/config.js      variables de entorno
  src/logger.js      logging con timestamp
  src/telegram.js    cliente de la Bot API
  src/downloader.js  descarga temporal
  src/storage.js     subida al almacenamiento externo (a implementar)
  src/handlers.js    logica de los mensajes
  src/poller.js      bucle de long polling
  src/server.js      health-check HTTP (requisito de Render)
  src/index.js       arranque
```

## Variables de entorno

| Variable | Descripcion |
| --- | --- |
| `BOT_TOKEN` | Token de @BotFather (obligatorio) |
| `PORT` | Puerto del health-check (Render lo inyecta) |
| `PUBLIC_BASE_URL` | Base del enlace publico devuelto |
| `MAX_VIDEO_MB` | Limite de descarga, por defecto 20 |

## Local

```bash
cd bot
cp .env.example .env
node --env-file=.env src/index.js
```

## Deploy en Render

- Tipo: **Web Service**
- Root Directory: `bot`
- Build Command: `npm install`
- Start Command: `npm start`
- Environment: `BOT_TOKEN` (y opcionalmente `PUBLIC_BASE_URL`, `MAX_VIDEO_MB`)

`render.yaml` en la raiz del repo ya define este servicio.

## Notas

- `getFile` de Telegram limita la descarga a 20 MB por archivo.
- Para migrar a webhooks basta sustituir `startLongPolling()` por una ruta
  POST que llame a `handleUpdate(update)`.
