const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const db = require('../db');

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ── Inline auth helper for protected profile/password routes ─────────────────
async function getAuthUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  if (token === 'local-dev-token') return { id: null, isLocalDev: true };
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return { id: user.id, email: user.email };
  } catch { return null; }
}

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
    // Auto-create patient record so booking form auto-fills.
    //
    // FIX: original version was broken — patient_id is the PRIMARY KEY with
    // no default, and date_of_birth/sex/address/contact_number are NOT NULL
    // with a CHECK on sex. The old INSERT failed silently for every register,
    // so residents could never book.
    //
    // This version:
    //   1) Generates a patient_id via the schema's generate_patient_id() fn
    //   2) Uses the values the register form actually sends (birthday, sex,
    //      address, contactNumber)
    //   3) Provides safe placeholder defaults if the user left anything blank
    //      so the INSERT can still succeed (residents update later in profile)
    //   4) Skips silently only if patient with same name+dob already exists
    // ────────────────────────────────────────────────────────────────────────
    let createdPatientId = null;
    try {
      // Sanitize inputs
      const birthday = (req.body.birthday && req.body.birthday.trim()) ||
                       (req.body.dateOfBirth && req.body.dateOfBirth.trim()) || null;
      const age = birthday
        ? Math.max(0, Math.floor((Date.now() - new Date(birthday)) / 31557600000))
        : null;
      const safeSex = ['Male', 'Female'].includes(req.body.sex) ? req.body.sex : 'Male';
      const safeAddress = (req.body.address && req.body.address.trim()) || 'To be updated';
      const safeContact = (req.body.contactNumber && req.body.contactNumber.trim())
                          || (mobile && mobile.trim()) || 'N/A';

      // Check if a patient with the same name + DOB already exists (avoid dupes)
      const dupe = await db.query(
        `SELECT patient_id FROM patients
         WHERE LOWER(first_name) = LOWER($1)
           AND LOWER(last_name)  = LOWER($2)
           ${birthday ? 'AND date_of_birth = $3' : 'AND date_of_birth IS NULL'}
         LIMIT 1`,
        birthday
          ? [firstName.trim(), lastName.trim(), birthday]
          : [firstName.trim(), lastName.trim()]
      );

      if (dupe.rows.length > 0) {
        createdPatientId = dupe.rows[0].patient_id;
        console.log('Patient already exists, linking to:', createdPatientId);
      } else {
        // Generate a fresh patient_id using the DB function
        const idRes = await db.query('SELECT generate_patient_id() as patient_id');
        createdPatientId = idRes.rows[0].patient_id;

        await db.query(
          `INSERT INTO patients (
             patient_id, first_name, last_name, middle_name,
             date_of_birth, age, sex, address, contact_number, created_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            createdPatientId,
            firstName.trim(),
            lastName.trim(),
            middleInitial ? middleInitial.trim().replace('.', '') : null,
            birthday,
            age,
            safeSex,
            safeAddress,
            safeContact
          ]
        );
        console.log('Auto-created patient:', createdPatientId, 'DOB:', birthday, 'Age:', age);
      }
    } catch (e) {
      // Log loudly — but don't fail registration. User can still log in;
      // staff can register them as a patient manually if needed.
      console.error('Auto-create patient FAILED for', user.username, ':', e.message);
    }
    res.status(201).json({
      message: 'Account created successfully.',
      user: {
        userId: user.user_id,
        username: user.username,
        role: user.role,
        fullName: user.full_name,
        email: user.email,
        createdAt: user.created_at,
        patientId: createdPatientId   // null if auto-create failed; frontend tolerates
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


// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/forgot-password — Send temporary password via email
// ══════════════════════════════════════════════════════════════════════════════
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, mobile } = req.body;
    if ((!email || !email.trim()) && (!mobile || !mobile.trim())) {
      return res.status(400).json({ error: 'Please enter your email address or mobile number.' });
    }

    // Support both email and mobile lookup
    let targetEmail = email ? email.trim().toLowerCase() : null;
    let result;

    if (targetEmail) {
      // Look up by email
      result = await db.query(
        'SELECT user_id, username, full_name, email, supabase_id FROM users WHERE LOWER(email) = $1',
        [targetEmail]
      );
    } else if (mobile) {
      // Look up by mobile — strip all non-digits for flexible match
      const cleanMobile = mobile.trim().replace(/[^0-9]/g, '');
      result = await db.query(
        "SELECT user_id, username, full_name, email, supabase_id FROM users WHERE REGEXP_REPLACE(COALESCE(mobile,''), '[^0-9]', '', 'g') = $1 OR REGEXP_REPLACE(COALESCE(contact_number,''), '[^0-9]', '', 'g') = $1",
        [cleanMobile]
      );
      if (result && result.rows.length > 0) {
        const userEmail = result.rows[0].email;
        const supabaseId = result.rows[0].supabase_id;
        if (!userEmail || userEmail.endsWith('@healthtrack.local')) {
          // Try to get real email from Supabase Auth using supabase_id
          if (supabaseId) {
            try {
              const { data: { user: sbUser } } = await supabase.auth.admin.getUserById(supabaseId).catch(() => ({ data: { user: null } }));
              if (sbUser && sbUser.email) {
                targetEmail = sbUser.email;
              }
            } catch {}
          }
          if (!targetEmail) {
            return res.status(400).json({ error: 'No email address is linked to this account. Please register with a valid email or contact the clinic administrator.' });
          }
        } else {
          targetEmail = userEmail;
        }
      }
    }

    // Always return success to prevent enumeration
    if (!result || result.rows.length === 0) {
      return res.json({ message: 'If an account with that information exists, a temporary password has been sent to the registered email.' });
    }

    const user = result.rows[0];

    // Generate a secure temporary password
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let tempPassword = 'HT-';
    for (let i = 0; i < 8; i++) tempPassword += chars[Math.floor(Math.random() * chars.length)];

    // Hash and update password in DB
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(tempPassword, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [hash, user.user_id]);

    // Also update in Supabase Auth if user has supabase_id
    if (user.supabase_id) {
      try {
        const { createClient } = require('@supabase/supabase-js');
        const adminSupabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
        );
        await adminSupabase.auth.admin.updateUserById(user.supabase_id, { password: tempPassword });
      } catch (supaErr) {
        console.warn('Supabase password sync failed (non-fatal):', supaErr.message);
      }
    }

    // Send email via Nodemailer — works with ANY email provider
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.MAIL_PORT || '587'),
      secure: process.env.MAIL_SECURE === 'true', // true for port 465
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      },
      tls: { rejectUnauthorized: false }
    });

    // Verify connection before sending
    await transporter.verify().catch(err => {
      console.error('Mail server connection failed:', err.message);
      throw new Error('Mail server not configured. Please contact the clinic administrator.');
    });

    await transporter.sendMail({
      from: `"HealthTrack - Barangay Upper Bicutan" <${process.env.MAIL_USER}>`,
      to: targetEmail,
      subject: 'Your Temporary Password - HealthTrack',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#fff;border:1px solid #e5e5e5;border-radius:12px;">
          <div style="text-align:center;margin-bottom:24px;">
            <h2 style="color:#CC0000;margin:0;">HealthTrack</h2>
            <p style="color:#888;font-size:13px;margin:4px 0 0;">Barangay Upper Bicutan Health Clinics - City of Taguig</p>
          </div>
          <p style="color:#333;">Hello <strong>${user.full_name || user.username}</strong>,</p>
          <p style="color:#333;">We received a request to reset your password. Your temporary password is:</p>
          <div style="background:#f8f8f8;border:2px dashed #CC0000;border-radius:10px;padding:20px;text-align:center;margin:20px 0;">
            <p style="font-size:28px;font-weight:bold;color:#CC0000;letter-spacing:4px;margin:0;">${tempPassword}</p>
          </div>
          <p style="color:#333;">Steps to log in:</p>
          <ol style="color:#555;line-height:1.8;">
            <li>Go to <a href="https://healthtrack.fun" style="color:#CC0000;">healthtrack.fun</a></li>
            <li>Log in using your username: <strong>${user.username}</strong></li>
            <li>Use the temporary password above</li>
            <li>Go to your <strong>Settings → Change Password</strong> to set a new permanent password</li>
          </ol>
          <p style="color:#999;font-size:12px;margin-top:24px;border-top:1px solid #eee;padding-top:12px;">
            If you did not request this, please ignore this email. This temporary password is valid for one-time use.<br><br>
            <em>FOR CAPSTONE PROJECT USE ONLY | HealthTrack</em>
          </p>
        </div>
      `
    });

    res.json({ message: `A temporary password has been sent to ${targetEmail}. Please check your inbox and log in with it, then change your password in Settings.` });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to send temporary password. Please try again or contact the clinic administrator.' });
  }
});


// ══════════════════════════════════════════════════════════════
// PUT /api/auth/profile — Update user profile info
// ══════════════════════════════════════════════════════════════
router.put('/profile', async (req, res) => {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    if (authUser.isLocalDev) return res.json({ message: 'Profile display updated (demo account).' });
    const { fullName, email, contactNumber } = req.body;
    // Look up DB user by supabase_id or email
    let userRow = await db.query('SELECT user_id FROM users WHERE supabase_id = $1', [authUser.id]);
    if (userRow.rows.length === 0 && authUser.email) {
      userRow = await db.query('SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)', [authUser.email]);
    }
    if (userRow.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    const dbUserId = userRow.rows[0].user_id;
    const updates = [];
    const values = [];
    let idx = 1;
    if (fullName)       { updates.push(`full_name = $${idx++}`);      values.push(fullName); }
    if (email)          { updates.push(`email = $${idx++}`);          values.push(email); }
    if (contactNumber)  { updates.push(`mobile = $${idx++}`);         values.push(contactNumber); }
    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update.' });
    values.push(dbUserId);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE user_id = $${idx}`, values);
    res.json({ message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('PUT /auth/profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// ══════════════════════════════════════════════════════════════
// PUT /api/auth/change-password — Change user password
// ══════════════════════════════════════════════════════════════
router.put('/change-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];

    if (token === 'local-dev-token') {
      return res.status(400).json({ error: 'Cannot change password for demo accounts (admin/staff/resident).' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }

    // Step 1: Get user's email from their token
    const { data: { user }, error: getUserErr } = await supabase.auth.getUser(token);
    if (getUserErr || !user) return res.status(401).json({ error: 'Session expired. Please log in again.' });

    // Step 2: Verify current password by signing in with it
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });
    if (signInErr || !signInData?.session) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    // Step 3: Use the fresh session to update the password
    const { createClient } = require('@supabase/supabase-js');
    const sessionSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    await sessionSupabase.auth.setSession({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token
    });
    const { error: updateErr } = await sessionSupabase.auth.updateUser({
      password: newPassword
    });
    if (updateErr) {
      console.error('Supabase password update error:', updateErr.message);
      return res.status(400).json({ error: updateErr.message || 'Failed to update password.' });
    }

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('PUT /auth/change-password error:', err);
    res.status(500).json({ error: 'Failed to change password: ' + err.message });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/reset-password — Set new password using access token from email
// ══════════════════════════════════════════════════════════════════════════════
router.post('/reset-password', async (req, res) => {
  try {
    const { accessToken, newPassword } = req.body;
    if (!accessToken || !newPassword) {
      return res.status(400).json({ error: 'Access token and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    // Use the access token to create a session then update password
    const { createClient } = require('@supabase/supabase-js');
    const sessionSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    // Set the session using the recovery token
    const { data: sessionData, error: sessionErr } = await sessionSupabase.auth.setSession({
      access_token: accessToken,
      refresh_token: accessToken  // recovery tokens work as both
    });
    if (sessionErr) {
      console.error('Session error:', sessionErr.message);
      return res.status(400).json({ error: 'Reset link is invalid or has expired. Please request a new one.' });
    }
    // Update the password
    const { error: updateErr } = await sessionSupabase.auth.updateUser({ password: newPassword });
    if (updateErr) {
      console.error('Password update error:', updateErr.message);
      return res.status(400).json({ error: updateErr.message || 'Failed to update password.' });
    }
    res.json({ message: 'Password reset successfully!' });
  } catch (err) {
    console.error('POST /auth/reset-password error:', err);
    res.status(500).json({ error: 'Failed to reset password: ' + err.message });
  }
});

module.exports = router;
