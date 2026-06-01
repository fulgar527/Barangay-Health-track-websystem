process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://rfxomnrzlqiopfexnlfx.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_gDKVGPRUV6pYd2qwEPAzzg_nbbV6Y66';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.rfxomnrzlqiopfexnlfx:Cuty0urs3lf2026@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || '3000';
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Behind Hostinger's reverse proxy — required so req.ip / X-Forwarded-For
// resolve to the real client, and so express-rate-limit doesn't throw.
app.set('trust proxy', 1);

// ══════════════════════════════════════════════════════════════════════════════
// ENVIRONMENT VALIDATION  (fail fast with a clear message, not a cryptic crash)
// ══════════════════════════════════════════════════════════════════════════════

// createClient() throws "supabaseUrl is required" at startup if these are
// missing, and ./db will crash without DATABASE_URL. Catch it here so
// `pm2 logs` tells you exactly what's wrong instead of a silent 503.
const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'DATABASE_URL'];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error('❌ Missing required environment variables: ' + missingEnv.join(', '));
  console.error('   Make sure a .env file exists on the server (it is gitignored,');
  console.error('   so it does NOT get deployed automatically) or set them in PM2.');
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const NODE_ENV = process.env.NODE_ENV || 'development';

// Supports a single origin or a comma-separated list. Defaults to '*'.
// NOTE: set ALLOWED_ORIGIN explicitly in production (e.g. https://yourdomain.com).
const allowedOrigins = (process.env.ALLOWED_ORIGIN || '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Initialize Supabase client for server-side operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Database connection (for business logic, not auth)
const db = require('./db');

// ══════════════════════════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE
// ══════════════════════════════════════════════════════════════════════════════

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "'unsafe-eval'",
                   "https://unpkg.com", "https://cdn.jsdelivr.net",
                   "https://cdn.tailwindcss.com"],
      styleSrc:   ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      imgSrc:     ["'self'", "data:", "blob:"],
      fontSrc:    ["'self'", "data:", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", process.env.SUPABASE_URL].filter(Boolean),
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS: a wildcard origin ('*') CANNOT be combined with credentials:true —
// browsers reject it. Using a function that reflects the request origin keeps
// it permissive while staying valid for credentialed requests.
app.use(cors({
  origin(origin, callback) {
    // Allow non-browser requests (curl, server-to-server) which have no origin.
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', limiter);

// ══════════════════════════════════════════════════════════════════════════════
// SUPABASE AUTH MIDDLEWARE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Middleware to verify Supabase JWT token
 * Attaches user info to req.user if valid
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    // Allow local-dev-token for default accounts
    if (token === 'local-dev-token') {
      req.user = {
        id: 'local-admin',
        email: 'admin@healthtrack.local',
        role: 'admin',
        username: 'admin'
      };
      return next();
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach user to request
    // role/username come from Supabase user_metadata (set via SQL or register route)
    req.user = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'staff',
      username: user.user_metadata?.username || (user.email ? user.email.split('@')[0] : 'user')
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

// Optional auth - doesn't fail if no token, just doesn't set req.user
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.user_metadata?.role || 'staff',
          username: user.user_metadata?.username || (user.email ? user.email.split('@')[0] : 'user')
        };
      }
    }
    next();
  } catch (error) {
    next(); // Continue even if auth fails
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FRONTEND STATIC FILES
// ══════════════════════════════════════════════════════════════════════════════

app.use(express.static(path.join(__dirname, 'frontend')));

// ══════════════════════════════════════════════════════════════════════════════
// API ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// Health check (no auth required)
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({
      status: 'OK',
      api: 'running',
      database: 'connected',
      auth: 'supabase',
      timestamp: new Date().toISOString(),
      env: NODE_ENV,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasDbUrl: !!process.env.DATABASE_URL
    });
  } catch (error) {
    res.status(503).json({
      status: 'DEGRADED',
      api: 'running',
      database: error.message,
      auth: 'supabase',
      timestamp: new Date().toISOString(),
      env: NODE_ENV,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasDbUrl: !!process.env.DATABASE_URL
    });
  }
});

// Auth info endpoint (returns current user if authenticated)
app.use('/api/auth', require('./routes/auth'));

// Business logic routes (all require authentication)
// ── PUBLIC: TV Queue Display endpoint — no auth needed ───────────────────────
app.get('/api/queue-display/live', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT q.queue_number, q.service_category, q.status,
              q.appointment_time, q.priority,
              COALESCE(p.first_name, split_part(q.patient_id,'-',1)) AS first_name,
              COALESCE(p.last_name, '') AS last_name,
              p.date_of_birth, p.pwd_id
       FROM queue q
       LEFT JOIN patients p ON q.patient_id = p.patient_id
       WHERE q.status NOT IN ('Completed', 'Cancelled', 'Rejected', 'Waiting')
         AND (
           q.status = 'In Progress'
           OR DATE(q.appointment_date) = CURRENT_DATE
           OR (q.appointment_date IS NULL AND DATE(q.created_at) = CURRENT_DATE)
         )
       ORDER BY
         CASE q.status WHEN 'In Progress' THEN 0 ELSE 1 END,
         CASE q.priority WHEN 'Priority Case' THEN 0 WHEN 'Urgent' THEN 1 ELSE 2 END,
         q.queue_number`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('queue-display/live error:', err.message);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// ── Notifications endpoints ───────────────────────────────────────────────────
// GET /api/notifications — fetch notifications for current user's patient
app.get('/api/notifications', requireAuth, async (req, res) => {
  try {
    // Find patient_id linked to this user via username
    const userResult = await db.query(
      `SELECT patient_id FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1`,
      [req.user.username]
    );
    if (!userResult.rows.length || !userResult.rows[0].patient_id) {
      return res.json([]);
    }
    const patientId = userResult.rows[0].patient_id;
    const result = await db.query(
      `SELECT * FROM notifications
       WHERE patient_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [patientId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /notifications error:', err.message);
    res.json([]);
  }
});

// PATCH /api/notifications/read — mark all as read
app.patch('/api/notifications/read', requireAuth, async (req, res) => {
  try {
    const userResult = await db.query(
      `SELECT patient_id FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1`,
      [req.user.username]
    );
    if (userResult.rows.length && userResult.rows[0].patient_id) {
      await db.query(
        `UPDATE notifications SET read = true WHERE patient_id = $1`,
        [userResult.rows[0].patient_id]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false });
  }
});

app.use('/api/patients', requireAuth, require('./routes/patients'));
app.use('/api/queue', requireAuth, require('./routes/queue'));
app.use('/api/services', requireAuth, require('./routes/services'));
app.use('/api/visit-log', requireAuth, require('./routes/visitLog'));
app.use('/api/analytics', requireAuth, require('./routes/analytics'));
app.use('/api/audit', requireAuth, require('./routes/audit'));
app.use('/api/service-categories', requireAuth, require('./routes/serviceCategories'));

// Serve React SPA for all non-API GET requests.
// Uses app.use() (no path) instead of app.get('*') — the literal '*' pattern
// is INVALID in Express 5 (path-to-regexp v8) and throws at startup. This form
// TV Queue Display — no auth required, public read-only page
app.get('/queue-display', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'queue-display.html'));
});

// works in both Express 4 and 5.
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api/')) return next();
res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: NODE_ENV === 'production' ? 'Something went wrong!' : err.message,
    ...(NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// STARTUP
// ══════════════════════════════════════════════════════════════════════════════

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error);
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HealthTrack API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log(`🔒 CORS origin: ${allowedOrigins.join(', ')}`);
  console.log(`🔐 Auth: Supabase`);
});

// ── Auto-promote: when appointment time slot arrives, show on TV ──────────────
// Runs every minute. If a patient's appointment_date = today AND
// appointment_time hour = current hour, and nobody is currently In Progress,
// automatically set them to In Progress so they appear on the TV display.
setInterval(async () => {
  try {
    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const currentHour = String(now.getHours()).padStart(2,'0') + ':00';

    // Check if anyone is already In Progress
    const inProgressCheck = await db.query(
      `SELECT queue_id FROM queue WHERE status = 'In Progress' AND DATE(created_at) = $1 LIMIT 1`,
      [localDate]
    );
    if (inProgressCheck.rows.length > 0) return; // someone already on TV

    // Find the next appointment whose time slot matches now
    // Use LEFT(appointment_time, 5) to handle both 'HH:MM' and 'HH:MM:SS' formats
    const result = await db.query(
      `UPDATE queue
       SET status = 'In Progress', time_started = NOW()
       WHERE queue_id = (
         SELECT queue_id FROM queue
         WHERE DATE(appointment_date) = $1
           AND LEFT(appointment_time::text, 5) = $2
           AND status IN ('Accepted', 'Waiting')
         ORDER BY
           CASE priority WHEN 'Priority Case' THEN 0 WHEN 'Urgent' THEN 1 ELSE 2 END,
           queue_number ASC
         LIMIT 1
       )
       RETURNING queue_id, queue_number`,
      [localDate, currentHour]
    );

    if (result.rows.length > 0) {
      console.log(`📺 Auto-promoted queue #${result.rows[0].queue_number} to TV display`);
    }
  } catch (err) {
    // Non-fatal — just log
    console.error('Auto-promote check error:', err.message);
  }
}, 60 * 1000); // every 60 seconds



// Graceful shutdown — lets PM2 reload/restart cleanly instead of being killed.
function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
  // Force-exit if connections don't drain in time.
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = { app, server };
