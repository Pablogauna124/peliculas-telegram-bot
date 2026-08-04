import { escapeHtml } from "../utils/html.js";

export function renderLayout(title, content) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, viewport-fit=cover"
  />

  <title>${escapeHtml(title)}</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at top, #172033 0%, #090b12 45%, #050608 100%);
      color: #ffffff;
      font-family: Arial, Helvetica, sans-serif;
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    .container {
      width: min(1200px, calc(100% - 32px));
      margin: 0 auto;
      padding: 32px 0 60px;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 32px;
    }

    .brand {
      font-size: 28px;
      font-weight: 800;
    }

    .brand span {
      color: #ef3340;
    }

    .subtitle {
      color: #a8afbf;
      margin-top: 6px;
    }

    .back {
      padding: 10px 15px;
      border: 1px solid #30384b;
      border-radius: 10px;
      background: #111624;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
      gap: 18px;
    }

    .card {
      overflow: hidden;
      border: 1px solid #252c3d;
      border-radius: 16px;
      background: rgba(18, 22, 34, 0.94);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .card:hover {
      transform: translateY(-4px);
      border-color: #ef3340;
    }

    .logo-box {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 130px;
      padding: 18px;
      background: #0b0e16;
    }

    .logo-box img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .fallback-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 70px;
      height: 70px;
      border-radius: 50%;
      background: #ef3340;
      font-size: 30px;
      font-weight: 800;
    }

    .card-body {
      padding: 16px;
    }

    .channel-name {
      margin: 0 0 8px;
      font-size: 18px;
    }

    .category {
      color: #a8afbf;
      font-size: 14px;
    }

    .player-shell {
      overflow: hidden;
      border: 1px solid #252c3d;
      border-radius: 18px;
      background: #000000;
    }

    video,
    iframe {
      display: block;
      width: 100%;
      min-height: 240px;
      border: 0;
      background: #000000;
    }

    video {
      max-height: 75vh;
    }

    iframe {
      height: min(70vh, 720px);
    }

    .channel-info {
      margin-top: 22px;
      padding: 20px;
      border: 1px solid #252c3d;
      border-radius: 16px;
      background: rgba(18, 22, 34, 0.94);
    }

    .message {
      margin-top: 18px;
      padding: 24px;
      border: 1px solid #3c2f34;
      border-radius: 15px;
      background: #211317;
      color: #ffbac1;
    }

    .external-button {
      display: inline-block;
      margin-top: 18px;
      padding: 12px 18px;
      border-radius: 10px;
      background: #ef3340;
      font-weight: 700;
    }

    @media (max-width: 600px) {
      .container {
        width: min(100% - 20px, 1200px);
        padding-top: 20px;
      }

      .brand {
        font-size: 23px;
      }

      iframe {
        height: 56.25vw;
      }
    }
  </style>
</head>

<body>
  ${content}
</body>
</html>`;
}
