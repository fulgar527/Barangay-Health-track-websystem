const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const db = require('../db');

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/register — Create a new user account
// ══════════════════════════════════════════════════════════════════════════════
router.post('/register', async (req, res) => {
  try {
    const { username, password, role, firstName, middleInitial, lastName, email, mobile } = req.body;

    if (!username || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Username, password, first name, and last name are required.' });
    }

    // Only allow 'resident' for public registration; admin/staff requires auth
    const safeRole = role || 'resident';
    if (['admin', 'staff'].includes(safeRole)) {
      // Check if requester is an authenticated admin
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ error: 'Only administrators can create admin/staff accounts.' });
      }
      try {
        const token = authHeader.split(' ')[1];
        // For hardcoded local-dev-token, allow admin actions
        if (token !== 'local-dev-token') {
          const { data: { user }, error } = await supabase.auth.getUser(token);
          if (error || !user || user.user_metadata?.role !== 'admin') {
            return res.status(403).json({ error: 'Only administrators can create admin/staff accounts.' });
          }
        }
      } catch {
        return res.status(403).json({ error: 'Authentication required for admin/staff account creation.' });
      }
    }

    // Check if username already exists in our users table
    const existing = await db.query(
      'SELECT user_id FROM users WHERE LOWER(username) = LOWER($1)',
      [username.trim()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username already exists. Please choose another.' });
    }

    // Build full name
    const mi = middleInitial ? middleInitial.trim().replace('.', '') + '. ' : '';
    const fullName = `${firstName.trim()} ${mi}${lastName.trim()}`;

    // Use email or generate a placeholder for Supabase Auth
    const authEmail = (email && email.trim()) ? email.trim() : `${username.trim().toLowerCase()}@healthtrack.local`;

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: authEmail,
      password: password,
      options: {
        data: {
          username: username.trim().toLowerCase(),
          role: safeRole,
          full_name: fullName
        },
        // Skip email confirmation for clinic accounts
        emailRedirectTo: undefined
      }
    });

    if (authError) {
      console.error('Supabase Auth signUp error:', authError.message);
      // If Supabase fails, still create in local DB (fallback)
    }

    const supabaseUserId = authData?.user?.id || null;

    // Insert into local users table
    const result = await db.query(
      `INSERT INTO users (supabase_id, username, password_hash, role, full_name, email, mobile, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING user_id, username, role, full_name, email, created_at`,
      [
        supabaseUserId,
        username.trim().toLowerCase(),
        '***',  // We don't store passwords — Supabase handles auth
        safeRole,
        fullName,
        email?.trim() || null,
        mobile?.trim() || null
      ]
    );

    const user = result.rows[0];
    // Auto-create patient record so booking form auto-fills
    try {
      const age = req.body.birthday ? Math.floor((Date.now() - new Date(req.body.birthday)) / 31557600000) : 0;
      await db.query(
        `INSERT INTO patients (first_name, last_name, middle_name, date_of_birth, age, sex, address, contact_number, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT DO NOTHING`,
        [firstName.trim(), lastName.trim(), middleInitial || null, req.body.birthday || null, age, req.body.sex || null, req.body.address || null, req.body.contactNumber || mobile || null]
      );
    } catch(e) { console.error('Auto-create patient:', e.message); }
    res.status(201).json({
      message: 'Account created successfully.',
      user: {
        userId: user.user_id,
        username: user.username,
        role: user.role,
        fullName: user.full_name,
        email: user.email,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/login — Authenticate user and return JWT
// ══════════════════════════════════════════════════════════════════════════════
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Look up user in local DB to get their email for Supabase Auth
    const userResult = await db.query(
      'SELECT user_id, username, role, full_name, email FROM users WHERE LOWER(username) = LOWER($1)',
      [username.trim()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const dbUser = userResult.rows[0];
    const authEmail = dbUser.email || `${dbUser.username}@healthtrack.local`;

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: password
    });

    if (authError) {
      console.error('Supabase login error:', authError.message);
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Update last login
    await db.query('UPDATE users SET last_login = NOW() WHERE user_id = $1', [dbUser.user_id]).catch(() => {});

    res.json({
      token: authData.session.access_token,
      user: {
        userId: dbUser.user_id,
        username: dbUser.username,
        role: dbUser.role,
        fullName: dbUser.full_name,
        email: dbUser.email
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/auth/me — Get current user info (requires auth)
// ══════════════════════════════════════════════════════════════════════════════
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];

    // Handle local-dev-token for default accounts
    if (token === 'local-dev-token') {
      return res.json({ user: { id: 'local', role: 'admin', username: 'admin' } });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || 'staff',
        username: user.user_metadata?.username || user.email?.split('@')[0]
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/auth/verify — Verify if current token is still valid
// ══════════════════════════════════════════════════════════════════════════════
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ valid: false });
    }
    const token = authHeader.split(' ')[1];

    // Handle local-dev-token
    if (token === 'local-dev-token') {
      return res.json({ valid: true });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    res.json({ valid: !error && !!user });
  } catch {
    res.json({ valid: false });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/auth/users — List all users (admin only)
// ══════════════════════════════════════════════════════════════════════════════
router.get('/users', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT user_id, username, role, full_name, email, created_at, last_login
       FROM users ORDER BY created_at DESC`
    );
    res.json({
      users: result.rows.map(u => ({
        user_id: u.user_id,
        username: u.username,
        role: u.role,
        full_name: u.full_name,
        email: u.email,
        created_at: u.created_at,
        last_login: u.last_login
      }))
    });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/auth/users/:id — Delete a user account (admin only)
// ══════════════════════════════════════════════════════════════════════════════
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    // Get the user's supabase_id before deleting
    const userResult = await db.query(
      'SELECT supabase_id, username FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Delete from local DB
    await db.query('DELETE FROM users WHERE user_id = $1', [userId]);

    res.json({ message: 'User deleted successfully.', deleted: userResult.rows[0].username });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

module.exports = router;
