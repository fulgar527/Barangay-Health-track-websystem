const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all patients
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM patients ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// BUG FIX #2: /search/:query MUST come before /:patientId.
// Express matches in registration order — if /:patientId is first, a request
// for /search/john hits the wildcard with patientId="search" and returns 404.
// ──────────────────────────────────────────────────────────────────────────────

// Search patients  ← MOVED ABOVE /:patientId
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const result = await db.query(
      `SELECT * FROM patients 
       WHERE last_name ILIKE $1 OR first_name ILIKE $1 OR patient_id ILIKE $1
       ORDER BY last_name, first_name`,
      [`%${query}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to search patients' });
  }
});

// Get patient by ID  ← wildcard stays below specific routes
router.get('/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const result = await db.query(
      'SELECT * FROM patients WHERE patient_id = $1',
      [patientId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// Create new patient
router.post('/', async (req, res) => {
  try {
    const {
      lastName, firstName, middleName, dateOfBirth, age, sex,
      address, contactNumber, civilStatus, occupation, philhealthNumber,
      emergencyContactPerson, emergencyContactNumber, allergies,
      chronicConditions, currentMedications
    } = req.body;

    const idResult = await db.query('SELECT generate_patient_id() as patient_id');
    const patientId = idResult.rows[0].patient_id;

    const result = await db.query(
      `INSERT INTO patients (
        patient_id, last_name, first_name, middle_name, date_of_birth, age, sex,
        address, contact_number, civil_status, occupation, philhealth_number,
        emergency_contact_person, emergency_contact_number, allergies,
        chronic_conditions, current_medications
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [patientId, lastName, firstName, middleName, dateOfBirth, age, sex,
       address, contactNumber, civilStatus, occupation, philhealthNumber,
       emergencyContactPerson, emergencyContactNumber, allergies,
       chronicConditions, currentMedications]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

// Update patient
router.put('/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const {
      lastName, firstName, middleName, dateOfBirth, age, sex,
      address, contactNumber, civilStatus, occupation, philhealthNumber,
      emergencyContactPerson, emergencyContactNumber, allergies,
      chronicConditions, currentMedications
    } = req.body;

    const result = await db.query(
      `UPDATE patients SET
        last_name = $2, first_name = $3, middle_name = $4, date_of_birth = $5,
        age = $6, sex = $7, address = $8, contact_number = $9, civil_status = $10,
        occupation = $11, philhealth_number = $12, emergency_contact_person = $13,
        emergency_contact_number = $14, allergies = $15, chronic_conditions = $16,
        current_medications = $17, updated_at = CURRENT_TIMESTAMP
      WHERE patient_id = $1
      RETURNING *`,
      [patientId, lastName, firstName, middleName, dateOfBirth, age, sex,
       address, contactNumber, civilStatus, occupation, philhealthNumber,
       emergencyContactPerson, emergencyContactNumber, allergies,
       chronicConditions, currentMedications]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

// Delete patient
router.delete('/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const result = await db.query(
      'DELETE FROM patients WHERE patient_id = $1 RETURNING *',
      [patientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json({ message: 'Patient deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

module.exports = router;
