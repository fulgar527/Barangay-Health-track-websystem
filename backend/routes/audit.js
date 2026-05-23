// HealthTrack — Audit Log Route
const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ──────────────────────────────────────────────────────────────────────────────
// BUG FIX #1 + #4 + #5:
//   - Removed `require('jsonwebtoken')` — it was never in package.json, so the
//     require threw "Cannot find module" at startup, crashing the server → 503.
//   - requireAdmin now reads req.user.role (set by server.js requireAuth) instead
//     of re-verifying the Supabase token with JWT_SECRET. Supabase tokens are
//     signed by Supabase's private key, so jwt.verify(tok, JWT_SECRET) always
//     threw JsonWebTokenError: invalid signature — every admin check silently
//     failed and audit log user IDs were always null.
//   - POST /api/audit now reads req.user from the middleware rather than doing
//     its own token verification.
// ──────────────────────────────────────────────────────────────────────────────

// ── Auth middleware ───────────────────────────────────────────────────────────
// requireAuth in server.js already ran before we get here, so req.user is set.
const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
  next();
};

// ── Helper to write an audit entry ───────────────────────────────────────────
const logAudit = async (dbClient, userId, action, targetTable, targetId, details, ipAddress) => {
  try {
    await dbClient.query(
      `INSERT INTO audit_log (user_id, action, target_table, target_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId || null, action, targetTable || null, String(targetId || ''), JSON.stringify(details || {}), ipAddress || null]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

// ── GET /api/audit — Admin only, paginated ────────────────────────────────────
router.get('/', requireAdmin, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const offset = (page - 1) * limit;

    const result = await db.query(
      `SELECT
         a.log_id, a.action, a.target_table, a.target_id,
         a.details, a.ip_address, a.created_at,
         u.username, u.full_name, u.role
       FROM audit_log a
       LEFT JOIN users u ON a.user_id = u.user_id
       ORDER BY a.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await db.query('SELECT COUNT(*) FROM audit_log');
    const total = parseInt(countResult.rows[0].count);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

// ── POST /api/audit — any authenticated user can log an action ───────────────
router.post('/', async (req, res) => {
  try {
    // FIX: req.user is already populated by requireAuth — no JWT re-verify needed
    const { id: uid, role, username } = req.user || {};
    const { action, details } = req.body;
    if (!action) return res.status(400).json({ error: 'action is required' });
    await logAudit(db, uid, action, null, null, { username, role, details }, req.ip);
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write audit entry.' });
  }
});

// ── DELETE /api/audit — Admin only, clears all logs ──────────────────────────
router.delete('/', requireAdmin, async (req, res) => {
  try {
    await db.query('TRUNCATE audit_log RESTART IDENTITY');
    res.json({ message: 'Audit log cleared.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to clear audit log.' });
  }
});

module.exports = router;
module.exports.logAudit = logAudit;
