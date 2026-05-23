const express = require('express');
const router = express.Router();
const db = require('../db');
const { logAudit } = require('./audit');

// ──────────────────────────────────────────────────────────────────────────────
// BUG FIX #1 + #4:
//   - Removed `require('jsonwebtoken')` — jsonwebtoken was never in package.json
//     so this line caused "Cannot find module" at startup → 503.
//   - Removed all jwt.verify() calls. server.js already runs requireAuth before
//     any request reaches this router, so req.user is guaranteed to be populated.
//     Using req.user.id directly gives correct audit actor IDs.
// ──────────────────────────────────────────────────────────────────────────────

// Get all queue entries
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM queue_with_patient_details 
       WHERE status != 'Completed' 
       ORDER BY 
         CASE priority 
           WHEN 'Priority Case' THEN 1 
           WHEN 'Urgent' THEN 2 
           WHEN 'Regular' THEN 3 
         END,
         time_queued`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// Get today's queue  ← MOVED above /:queueId to avoid shadowing
router.get('/today/all', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM queue_with_patient_details 
       WHERE DATE(created_at) = CURRENT_DATE
       ORDER BY queue_number`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch today\'s queue' });
  }
});

// Get queue entry by ID
router.get('/:queueId', async (req, res) => {
  try {
    const { queueId } = req.params;
    const result = await db.query(
      'SELECT * FROM queue_with_patient_details WHERE queue_id = $1',
      [queueId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Queue entry not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch queue entry' });
  }
});

// Add to queue
router.post('/', async (req, res) => {
  try {
    const {
      patientId, serviceCategory, serviceName, priority,
      chiefComplaint, appointmentDate, appointmentTime, selfBooked, bookedByUsername
    } = req.body;

    const queueNumResult = await db.query('SELECT get_next_queue_number() as queue_number');
    const queueNumber = queueNumResult.rows[0].queue_number;

    const serviceResult = await db.query(
      'SELECT service_id FROM services WHERE service_name = $1',
      [serviceName]
    );
    const serviceId = serviceResult.rows.length > 0 ? serviceResult.rows[0].service_id : null;

    if (appointmentDate && appointmentTime) {
      const conflict = await db.query(
        `SELECT COUNT(*) FROM queue
         WHERE appointment_date = $1
           AND appointment_time = $2
           AND status NOT IN ('Cancelled', 'Rejected')`,
        [appointmentDate, appointmentTime]
      );
      if (parseInt(conflict.rows[0].count) >= 1) {
        return res.status(409).json({ error: 'This appointment slot is already fully booked. Please choose a different time.' });
      }
    }

    const result = await db.query(
      `INSERT INTO queue (
        queue_number, patient_id, service_id, service_category, service_name,
        priority, chief_complaint, appointment_date, appointment_time, self_booked, booked_by_username
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [queueNumber, patientId, serviceId, serviceCategory, serviceName,
       priority, chiefComplaint, appointmentDate, appointmentTime, selfBooked || false, bookedByUsername || null]
    );

    // FIX: use req.user.id set by requireAuth — no JWT re-verification needed
    await logAudit(db, req.user?.id, 'ADD_QUEUE', 'queue', result.rows[0].queue_id, { patientId, serviceName, priority }, req.ip);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add to queue' });
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
    }

    const result = await db.query(
      `UPDATE queue SET ${updateFields} WHERE queue_id = $1 RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Queue entry not found' });
    }

    // FIX: use req.user.id
    await logAudit(db, req.user?.id, `QUEUE_${status.toUpperCase().replace(' ','_')}`, 'queue', queueId,
      { status, rejectedReason: req.body.rejectedReason || null }, req.ip);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
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

    await client.query('COMMIT');
    res.json({ message: 'Queue completed and moved to visit log' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
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
      const svc = await db.query('SELECT service_id FROM services WHERE service_name = $1', [serviceName]);
      if (svc.rows.length) serviceId = svc.rows[0].service_id;
    }

    const result = await db.query(
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

    // FIX: use req.user.id
    await logAudit(db, req.user?.id, 'EDIT_QUEUE', 'queue', queueId, { serviceName, appointmentDate, appointmentTime }, req.ip);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update queue entry' });
  }
});

// Delete queue entry
router.delete('/:queueId', async (req, res) => {
  try {
    const { queueId } = req.params;
    const result = await db.query(
      'DELETE FROM queue WHERE queue_id = $1 RETURNING *',
      [queueId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Queue entry not found' });
    }

    // FIX: use req.user.id
    await logAudit(db, req.user?.id, 'DELETE_QUEUE', 'queue', queueId, {}, req.ip);
    res.json({ message: 'Queue entry deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete queue entry' });
  }
});

module.exports = router;
