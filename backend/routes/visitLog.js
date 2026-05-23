const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all visit log entries
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, patientId } = req.query;
    
    let query = 'SELECT * FROM visit_log_with_patient_details WHERE 1=1';
    const params = [];
    
    if (startDate) {
      params.push(startDate);
      query += ` AND visit_date >= $${params.length}`;
    }
    
    if (endDate) {
      params.push(endDate);
      query += ` AND visit_date <= $${params.length}`;
    }
    
    if (patientId) {
      params.push(patientId);
      query += ` AND patient_id = $${params.length}`;
    }
    
    query += ' ORDER BY visit_date DESC, created_at DESC';
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch visit log' });
  }
});

// Get visit log by patient ID
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const result = await db.query(
      `SELECT * FROM visit_log_with_patient_details 
       WHERE patient_id = $1 
       ORDER BY visit_date DESC`,
      [patientId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch visit history' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// BUG FIX #3: /export/csv MUST come before /:visitId.
// Express registered /:visitId first, so GET /export/csv matched the wildcard
// with visitId="export" — query found nothing, returned 404 forever.
// ──────────────────────────────────────────────────────────────────────────────

// Export visit log to CSV format  ← MOVED ABOVE /:visitId
router.get('/export/csv', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM visit_log_with_patient_details WHERE 1=1';
    const params = [];
    
    if (startDate) {
      params.push(startDate);
      query += ` AND visit_date >= $${params.length}`;
    }
    
    if (endDate) {
      params.push(endDate);
      query += ` AND visit_date <= $${params.length}`;
    }
    
    query += ' ORDER BY visit_date DESC';
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export visit log' });
  }
});

// Get visit log entry by ID  ← wildcard stays below specific routes
router.get('/:visitId', async (req, res) => {
  try {
    const { visitId } = req.params;
    const result = await db.query(
      'SELECT * FROM visit_log_with_patient_details WHERE visit_id = $1',
      [visitId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch visit' });
  }
});

// Update visit log entry
router.put('/:visitId', async (req, res) => {
  try {
    const { visitId } = req.params;
    const { diagnosis, treatment, prescription, vitalSigns, notes } = req.body;

    const result = await db.query(
      `UPDATE visit_log SET
        diagnosis = $2, treatment = $3, prescription = $4,
        vital_signs = $5, notes = $6, updated_at = CURRENT_TIMESTAMP
      WHERE visit_id = $1
      RETURNING *`,
      [visitId, diagnosis, treatment, prescription,
       vitalSigns ? JSON.stringify(vitalSigns) : null, notes]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update visit' });
  }
});

module.exports = router;
