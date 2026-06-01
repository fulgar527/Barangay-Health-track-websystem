const express = require('express');
const router = express.Router();
const db = require('../db');
const { logAudit } = require('./audit');

// ──────────────────────────────────────────────────────────────────────────────
// HEALTHTRACK QUEUE ROUTER — ROBUST VERSION (May 2026)
// 
// Fixes:
// - BUG #1: Removed missing jsonwebtoken import
// - BUG #4: Use req.user.id from requireAuth middleware
// - BUG #5: Added detailed validation & logging for "Failed to add to queue"
// - BUG #6: Better service lookup with fallback & null tolerance
// - BUG #7: Connection timeout handling with retry logic
// ──────────────────────────────────────────────────────────────────────────────

// Helper: Safe database query with retry
async function queryWithRetry(query, params, retries = 2) {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      return await db.query(query, params);
    } catch (err) {
      lastError = err;
      console.warn(`⚠️  Query attempt ${i + 1} failed:`, err.message);
      if (i < retries) {
        console.log('🔄 Retrying in 100ms...');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
  throw lastError;
}

// Get all queue entries
router.get('/', async (req, res) => {
  try {
    const result = await queryWithRetry(
      `SELECT * FROM queue_with_patient_details
       WHERE (
         status NOT IN ('Completed', 'Cancelled')
         OR (status = 'Completed' AND DATE(time_completed) = CURRENT_DATE)
         OR (status = 'Rejected' AND DATE(rejected_at) = CURRENT_DATE)
       )
       ORDER BY
         CASE status
           WHEN 'In Progress' THEN 0
           WHEN 'Accepted'    THEN 1
           WHEN 'Waiting'     THEN 2
           WHEN 'Rejected'    THEN 3
           WHEN 'Completed'   THEN 4
           ELSE 5
         END,
         CASE priority
           WHEN 'Priority Case' THEN 1
           WHEN 'Urgent'        THEN 2
           WHEN 'Regular'       THEN 3
         END,
         time_queued`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ GET /queue failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// Get today's queue
router.get('/today/all', async (req, res) => {
  try {
    const result = await queryWithRetry(
      `SELECT * FROM queue_with_patient_details 
       WHERE DATE(created_at) = CURRENT_DATE
       ORDER BY queue_number`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ GET /queue/today/all failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch today\'s queue' });
  }
});

// Get queue entry by ID
router.get('/:queueId', async (req, res) => {
  try {
    const { queueId } = req.params;
    const result = await queryWithRetry(
      'SELECT * FROM queue_with_patient_details WHERE queue_id = $1',
      [queueId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Queue entry not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ GET /queue/:queueId failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch queue entry' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADD TO QUEUE — WITH COMPREHENSIVE DIAGNOSTICS & RETRY LOGIC
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  const logPrefix = '📝 QUEUE_BOOKING';
  
  try {
    const {
      patientId, serviceCategory, serviceName, priority,
      chiefComplaint, appointmentDate, appointmentTime, selfBooked, bookedByUsername
    } = req.body;

    console.log(`${logPrefix}:`, {
      patientId,
      serviceCategory,
      serviceName,
      priority,
      appointmentDate,
      appointmentTime
    });

    // ────── VALIDATION 1: Required fields exist ──────
    if (!patientId) {
      console.error('❌ Patient ID is missing');
      return res.status(400).json({ 
        error: 'Patient ID is required.',
        detail: 'No patient ID provided in request.'
      });
    }

    if (!serviceName) {
      console.error('❌ Service name is missing');
      return res.status(400).json({ 
        error: 'Service name is required.',
        detail: 'No service selected.'
      });
    }

    // ────── VALIDATION 2: Check patient exists (WITH RETRY) ──────
    let patientCheck;
    try {
      patientCheck = await queryWithRetry(
        'SELECT patient_id FROM patients WHERE patient_id = $1',
        [patientId],
        2
      );
    } catch (err) {
      console.error('❌ Patient lookup failed (DB error):', err.message);
      return res.status(500).json({ 
        error: 'Database connection error during patient verification.',
        detail: 'Please try again in a moment.'
      });
    }

    if (patientCheck.rows.length === 0) {
      console.error('❌ Patient not found:', patientId);
      return res.status(400).json({ 
        error: 'Patient not found. Please register first.',
        detail: `Patient ID "${patientId}" does not exist in the system.`
      });
    }
    console.log('✅ Patient verified:', patientId);

    // ────── QUEUE NUMBER: only assign for walk-ins or admin/staff bookings ──────
    // Self-booked residents get queue number assigned when admin ACCEPTS the booking
    const isResidentSelfBooked = selfBooked === true || selfBooked === 'true';
    let queueNumber = null;

    if (!isResidentSelfBooked) {
      // Walk-in or staff/admin booking → assign queue number immediately
      try {
        const queueNumResult = await queryWithRetry(
          'SELECT get_next_queue_number() as queue_number', [], 2
        );
        queueNumber = queueNumResult.rows[0].queue_number;
        console.log('✅ Queue number generated:', queueNumber);
      } catch (qErr) {
        console.error('❌ Queue number generation failed:', qErr.message);
        return res.status(500).json({ error: 'Failed to generate queue number.', detail: qErr.message });
      }
    } else {
      console.log('📋 Self-booked resident — queue number will be assigned on admin acceptance');
    }

    // ────── VALIDATION 4: Lookup service ID (WITH RETRY & FALLBACK) ──────
    let serviceId = null;
    try {
      console.log(`🔍 Looking up service: "${serviceName}"`);
      
      const serviceResult = await queryWithRetry(
        'SELECT service_id FROM services WHERE service_name = $1',
        [serviceName],
        2  // Retry once on timeout
      );

      if (serviceResult.rows.length > 0) {
        serviceId = serviceResult.rows[0].service_id;
        console.log('✅ Service found (ID: ' + serviceId + '):', serviceName);
      } else {
        console.warn('⚠️  Service not found in database:', serviceName);
        console.log('   Available services will be logged to debug.');
        
        // Log available services for debugging
        try {
          const allServices = await queryWithRetry(
            'SELECT DISTINCT service_name FROM services ORDER BY service_name',
            [],
            1
          );
          console.log('   Available services:');
          allServices.rows.forEach((s, i) => {
            console.log(`     ${i + 1}. "${s.service_name}"`);
          });
        } catch (listErr) {
          console.warn('   Could not list available services:', listErr.message);
        }

        // Don't fail — allow null service_id (optional field)
        console.log('⚠️  Proceeding without service_id (will be NULL)');
      }
    } catch (sErr) {
      console.error('❌ Service lookup query failed:', sErr.code, sErr.message);
      console.error('   Message:', sErr.detail || 'No detail');
      
      // Check if it's a timeout or connection error
      if (sErr.message.includes('timeout') || sErr.message.includes('ECONNREFUSED')) {
        return res.status(503).json({ 
          error: 'Database temporarily unavailable.',
          detail: 'Service lookup timed out. Please try again.'
        });
      }

      return res.status(500).json({ 
        error: 'Failed to look up service.',
        detail: sErr.message
      });
    }

    // ────── VALIDATION 5: Check appointment slot availability ──────
    if (appointmentDate && appointmentTime) {
      try {
        const conflict = await queryWithRetry(
          `SELECT COUNT(*) FROM queue
           WHERE appointment_date = $1
             AND appointment_time = $2
             AND status NOT IN ('Cancelled', 'Rejected')`,
          [appointmentDate, appointmentTime],
          1
        );
        
        const SLOT_CAPACITY = 38; // matches frontend default
        const count = parseInt(conflict.rows[0].count);
        if (count >= SLOT_CAPACITY) {
          console.warn('⚠️  Appointment slot full:', appointmentDate, appointmentTime);
          return res.status(409).json({ 
            error: 'This appointment slot is already fully booked. Please choose a different time.' 
          });
        }
        console.log('✅ Appointment slot available:', appointmentDate, appointmentTime, `(${count}/${SLOT_CAPACITY})`);
      } catch (cErr) {
        console.error('❌ Conflict check failed:', cErr.message);
        return res.status(500).json({ 
          error: 'Failed to check appointment availability.',
          detail: cErr.message
        });
      }
    }

    // ────── VALIDATION 6: Chief complaint required ──────
    const finalChiefComplaint = chiefComplaint?.trim() || 'Scheduled appointment';
    if (!chiefComplaint || chiefComplaint.trim() === '') {
      console.warn('⚠️  Chief complaint empty, using default: "Scheduled appointment"');
    } else {
      console.log('✅ Chief complaint provided');
    }

    // ────── AUTO-PRIORITY: Senior Citizen / PWD override ──────
    let finalPriority = priority || 'Regular';
    try {
      const patData = await db.query(
        'SELECT age, date_of_birth, pwd_id FROM patients WHERE patient_id = $1', [patientId]
      );
      if (patData.rows.length > 0) {
        const p = patData.rows[0];
        if (p.pwd_id) {
          finalPriority = 'Priority Case';
          console.log('♿ PWD detected → Priority Case');
        } else {
          // Always calculate age from DOB for accuracy — don't trust stored age column
          const realAge = p.date_of_birth
            ? Math.floor((Date.now() - new Date(p.date_of_birth)) / 31557600000)
            : (p.age || 0);
          if (realAge >= 60) {
            finalPriority = finalPriority === 'Priority Case' ? 'Priority Case' : 'Urgent';
            console.log('👴 Senior Citizen detected (age', realAge, ') → Urgent');
          }
        }
      }
    } catch (prioErr) {
      console.warn('⚠️ Auto-priority check failed (non-fatal):', prioErr.message);
    }

    // ────── INSERT QUEUE ENTRY (WITH RETRY) ──────
    let result;
    try {
      console.log('📤 Inserting queue entry...');
      const initialStatus = isResidentSelfBooked ? 'Waiting' : 'Waiting';
      result = await queryWithRetry(
        `INSERT INTO queue (
          queue_number, patient_id, service_id, service_category, service_name,
          priority, chief_complaint, appointment_date, appointment_time,
          self_booked, booked_by_username, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          queueNumber, patientId, serviceId, serviceCategory, serviceName,
          finalPriority, finalChiefComplaint,
          appointmentDate || null, appointmentTime || null,
          selfBooked || false, bookedByUsername || null, initialStatus
        ],
        1
      );
      console.log('✅ Queue entry created (ID:', result.rows[0].queue_id, '| Queue#:', queueNumber || 'PENDING', ')');
    } catch (insertErr) {
      console.error('❌ INSERT failed:', {
        code: insertErr.code,
        message: insertErr.message,
        detail: insertErr.detail
      });

      // Handle specific PostgreSQL error codes
      if (insertErr.code === '23503') {
        // Foreign key violation
        return res.status(400).json({ 
          error: 'Invalid patient or service reference.',
          detail: 'Patient ID does not exist. Please register first.'
        });
      } else if (insertErr.code === '23502') {
        // NOT NULL violation
        return res.status(400).json({ 
          error: 'Missing required field.',
          detail: insertErr.message
        });
      } else if (insertErr.code === '23505') {
        // Unique constraint violation
        return res.status(409).json({ 
          error: 'Duplicate entry.',
          detail: 'This appointment already exists.'
        });
      }

      return res.status(500).json({ 
        error: 'Failed to add to queue.',
        detail: insertErr.message
      });
    }

    // ────── AUDIT LOG (NON-CRITICAL) ──────
    try {
      await logAudit(db, req.user?.username, 'ADD_QUEUE', 'queue', result.rows[0].queue_id, 
        { patientId, serviceName, priority }, req.ip);
    } catch (auditErr) {
      console.warn('⚠️  Audit log failed (non-critical):', auditErr.message);
    }

    console.log('✅ BOOKING COMPLETE');
    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error('❌ Unexpected error in POST /queue:', err);
    res.status(500).json({ 
      error: 'Failed to add to queue',
      detail: err.message
    });
  }
});

// Update queue status
router.patch('/:queueId/status', async (req, res) => {
  try {
    const { queueId } = req.params;
    const { status } = req.body;

    let updateFields = 'status = $2, updated_at = CURRENT_TIMESTAMP';
    let params = [queueId, status];

    if (status === 'In Progress') {
      updateFields += ', time_started = CURRENT_TIMESTAMP';
    } else if (status === 'Completed') {
      updateFields += ', time_completed = CURRENT_TIMESTAMP';
    } else if (status === 'Rejected') {
      const { rejectedReason } = req.body;
      updateFields += `, rejected_reason = $${params.length + 1}, rejected_at = CURRENT_TIMESTAMP`;
      params.push(rejectedReason || null);
    } else if (status === 'Accepted') {
      // ── Assign queue number now if not yet assigned (self-booked residents) ──
      const existing = await db.query(
        'SELECT queue_number FROM queue WHERE queue_id = $1', [queueId]
      );
      if (existing.rows.length > 0 && !existing.rows[0].queue_number) {
        try {
          const qnResult = await db.query('SELECT get_next_queue_number() as queue_number');
          const assignedNumber = qnResult.rows[0].queue_number;
          updateFields += `, queue_number = $${params.length + 1}`;
          params.push(assignedNumber);
          console.log(`✅ Queue number ${assignedNumber} assigned to queue_id ${queueId} on acceptance`);
        } catch (qnErr) {
          console.warn('⚠️ Failed to assign queue number on acceptance:', qnErr.message);
        }
      }
    }

    const result = await queryWithRetry(
      `UPDATE queue SET ${updateFields} WHERE queue_id = $1 RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Queue entry not found' });
    }

    // ── Save in-app notification for resident ──────────────────────────────
    try {
      const q = result.rows[0];
      let notifTitle = '', notifMessage = '', notifType = '';
      const apptDate = q.appointment_date
        ? new Date(q.appointment_date).toLocaleDateString('en-PH', {weekday:'short', month:'short', day:'numeric', year:'numeric'})
        : 'N/A';

      if (status === 'Accepted') {
        notifTitle = '✅ Appointment Accepted';
        notifMessage = `Your appointment on ${apptDate} for ${q.service_category || q.service_name} has been accepted. Your queue number is #${String(q.queue_number).padStart(3,'0')}. Please arrive on time.`;
        notifType = 'accepted';
      } else if (status === 'Rejected') {
        notifTitle = '❌ Appointment Rejected';
        notifMessage = `Your appointment on ${apptDate} has been rejected. Reason: ${req.body.rejectedReason || 'No reason provided'}. Please contact the clinic or book a new appointment.`;
        notifType = 'rejected';
      }

      if (notifTitle && q.patient_id) {
        await db.query(
          `INSERT INTO notifications (patient_id, title, message, type, queue_id, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [q.patient_id, notifTitle, notifMessage, notifType, queueId]
        ).catch(e => console.warn('⚠️ Notification save failed (non-fatal):', e.message));
      }
    } catch (notifErr) {
      console.warn('⚠️ Notification error (non-fatal):', notifErr.message);
    }

    await logAudit(db, req.user?.username, `QUEUE_${status.toUpperCase().replace(' ','_')}`, 'queue', queueId,
      { status, rejectedReason: req.body.rejectedReason || null }, req.ip);

    // ── Auto-advance: when patient is Completed, move next priority patient to In Progress ──
    if (status === 'Completed' && req.body.autoAdvance !== false) {
      try {
        const next = await db.query(
          `UPDATE queue SET status = 'In Progress', time_started = CURRENT_TIMESTAMP
           WHERE queue_id = (
             SELECT queue_id FROM queue
             WHERE status = 'Accepted'
               AND (DATE(appointment_date) = CURRENT_DATE OR appointment_date IS NULL)
             ORDER BY
               CASE priority WHEN 'Priority Case' THEN 0 WHEN 'Urgent' THEN 1 ELSE 2 END,
               queue_number ASC NULLS LAST,
               created_at ASC
             LIMIT 1
           )
           RETURNING queue_id, queue_number, service_category`,
          []
        );
        if (next.rows.length > 0) {
          console.log(`✅ Auto-advanced to queue #${next.rows[0].queue_number}`);
        }
      } catch (advErr) {
        console.warn('⚠️ Auto-advance failed (non-fatal):', advErr.message);
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ PATCH /queue/:queueId/status failed:', err.message);
    res.status(500).json({ error: 'Failed to update queue status' });
  }
});

// Complete queue and move to visit log
router.post('/:queueId/complete', async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');

    const { queueId } = req.params;
    const { diagnosis, treatment, prescription, vitalSigns, notes, attendedBy } = req.body;

    const queueResult = await client.query(
      'SELECT * FROM queue WHERE queue_id = $1',
      [queueId]
    );

    if (queueResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Queue entry not found' });
    }

    const queueEntry = queueResult.rows[0];

    const patientResult = await client.query(
      'SELECT * FROM patients WHERE patient_id = $1', [queueEntry.patient_id]
    );
    const patient = patientResult.rows[0] || {};

    await client.query(
      `INSERT INTO visit_log (
        patient_id, queue_id, service_category, service_name, priority,
        chief_complaint, civil_status, occupation, philhealth_number,
        emergency_contact_person, emergency_contact_number,
        allergies, chronic_conditions, current_medications,
        diagnosis, treatment, prescription, vital_signs,
        notes, time_queued, time_served, attended_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,CURRENT_TIMESTAMP,$21)`,
      [
        queueEntry.patient_id, queueId, queueEntry.service_category,
        queueEntry.service_name, queueEntry.priority, queueEntry.chief_complaint,
        patient.civil_status || null, patient.occupation || null,
        patient.philhealth_number || null,
        patient.emergency_contact_person || null, patient.emergency_contact_number || null,
        patient.allergies || null, patient.chronic_conditions || null,
        patient.current_medications || null,
        diagnosis, treatment, prescription,
        vitalSigns ? JSON.stringify(vitalSigns) : null,
        notes, queueEntry.time_queued, attendedBy
      ]
    );

    await client.query(
      `UPDATE queue SET status = 'Completed', time_completed = CURRENT_TIMESTAMP 
       WHERE queue_id = $1`,
      [queueId]
    );

    // ── Auto-advance: move next priority Accepted patient to In Progress ──
    try {
      const next = await client.query(
        `UPDATE queue SET status = 'In Progress', time_started = CURRENT_TIMESTAMP
         WHERE queue_id = (
           SELECT queue_id FROM queue
           WHERE status = 'Accepted'
             AND (DATE(appointment_date) = CURRENT_DATE OR appointment_date IS NULL)
           ORDER BY
             CASE priority WHEN 'Priority Case' THEN 0 WHEN 'Urgent' THEN 1 ELSE 2 END,
             queue_number ASC NULLS LAST,
             created_at ASC
           LIMIT 1
         )
         RETURNING queue_id, queue_number`
      );
      if (next.rows.length > 0) {
        console.log(`✅ Auto-advanced to queue #${next.rows[0].queue_number}`);
      }
    } catch (advErr) {
      console.warn('⚠️ Auto-advance failed (non-fatal):', advErr.message);
    }

    await client.query('COMMIT');
    res.json({ message: 'Queue completed and moved to visit log' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ POST /queue/:queueId/complete failed:', err.message);
    res.status(500).json({ error: 'Failed to complete queue entry' });
  } finally {
    client.release();
  }
});

// Edit appointment (reschedule / update service)
router.put('/:queueId', async (req, res) => {
  try {
    const { queueId } = req.params;
    const { serviceCategory, serviceName, priority, chiefComplaint, appointmentDate, appointmentTime } = req.body;

    let serviceId = null;
    if (serviceName) {
      const svc = await queryWithRetry(
        'SELECT service_id FROM services WHERE service_name = $1', 
        [serviceName]
      );
      if (svc.rows.length) serviceId = svc.rows[0].service_id;
    }

    const result = await queryWithRetry(
      `UPDATE queue SET
        service_category  = COALESCE($2, service_category),
        service_name      = COALESCE($3, service_name),
        service_id        = COALESCE($4, service_id),
        priority          = COALESCE($5, priority),
        chief_complaint   = COALESCE($6, chief_complaint),
        appointment_date  = COALESCE($7, appointment_date),
        appointment_time  = COALESCE($8, appointment_time),
        updated_at        = CURRENT_TIMESTAMP
      WHERE queue_id = $1
      RETURNING *`,
      [queueId, serviceCategory||null, serviceName||null, serviceId, priority||null,
       chiefComplaint||null, appointmentDate||null, appointmentTime||null]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Queue entry not found' });

    await logAudit(db, req.user?.username, 'EDIT_QUEUE', 'queue', queueId, 
      { serviceName, appointmentDate, appointmentTime }, req.ip);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ PUT /queue/:queueId failed:', err.message);
    res.status(500).json({ error: 'Failed to update queue entry' });
  }
});

// Delete queue entry
router.delete('/:queueId', async (req, res) => {
  try {
    const { queueId } = req.params;
    const result = await queryWithRetry(
      'DELETE FROM queue WHERE queue_id = $1 RETURNING *',
      [queueId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Queue entry not found' });
    }

    await logAudit(db, req.user?.username, 'DELETE_QUEUE', 'queue', queueId, {}, req.ip);
    res.json({ message: 'Queue entry deleted successfully' });
  } catch (err) {
    console.error('❌ DELETE /queue/:queueId failed:', err.message);
    res.status(500).json({ error: 'Failed to delete queue entry' });
  }
});

module.exports = router;
