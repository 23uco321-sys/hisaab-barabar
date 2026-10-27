import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_CONFIG } from './config.js';
import { apiRouter } from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const app = express();
const startTime = Date.now();

// Standard middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from public directory
app.use(express.static(path.join(projectRoot, 'public')));

// Security and Content Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Health check endpoint (Cloud Run & container monitors)
app.get('/healthz', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    service: 'Hisaab-Barabar',
    version: '1.0.0',
    sdg: 'UN SDG 8: Decent Work and Economic Growth'
  });
});

// API routes
app.use('/api', apiRouter);

// Page Views
app.get('/', (req, res) => {
  res.sendFile(path.join(projectRoot, 'src', 'views', 'landing.html'));
});

app.get('/worker', (req, res) => {
  res.sendFile(path.join(projectRoot, 'src', 'views', 'worker.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(projectRoot, 'src', 'views', 'admin.html'));
});

// 404 fallback
app.use((req, res) => {
  if (req.accepts('html')) {
    res.status(404).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>404 Not Found — Hisaab Barabar</title>
        <link rel="stylesheet" href="/css/editorial.css">
      </head>
      <body>
        <main class="page-container" style="padding-top: 5rem;">
          <p class="overline">Page Not Found</p>
          <h1 class="headline-serif" style="font-size: 3rem; margin: 1rem 0;">404 — The ledger page does not exist.</h1>
          <p class="lead-text" style="max-width: 32rem; margin-bottom: 2rem;">The requested address could not be found on this ledger node.</p>
          <a href="/" class="btn btn-primary">Return to Index</a>
        </main>
      </body>
      </html>
    `);
  } else {
    res.status(404).json({ error: 'Endpoint not found.' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error occurred.' });
});

// Start listening if run directly as main script
const PORT = DEFAULT_CONFIG.port;
const HOST = '0.0.0.0';

const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('server.js') ||
  process.argv[1].endsWith('server')
);

if (isMainModule && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    console.log(`[Hisaab Barabar] Server online on http://${HOST}:${PORT}`);
    console.log(`[Hisaab Barabar] Health check available at http://${HOST}:${PORT}/healthz`);
  });
}

export default app;
