const express = require('express');
const router = express.Router();
const db = require('../db');

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const stats = {};
    
    // Total patients
    const patientsResult = await db.query('SELECT COUNT(*) as count FROM patients');
    stats.totalPatients = parseInt(patientsResult.rows[0].count);
    
    // Current queue count
    const queueResult = await db.query(
      "SELECT COUNT(*) as count FROM queue WHERE status != 'Completed'"
    );
    stats.inQueue = parseInt(queueResult.rows[0].count);
    
    // Priority cases in queue
    const priorityResult = await db.query(
      "SELECT COUNT(*) as count FROM queue WHERE priority = 'Priority Case' AND status != 'Completed'"
    );
    stats.priorityCases = parseInt(priorityResult.rows[0].count);
    
    // Today's visits
    const todayResult = await db.query(
      'SELECT COUNT(*) as count FROM visit_log WHERE visit_date = CURRENT_DATE'
    );
    stats.todayVisits = parseInt(todayResult.rows[0].count);
    
    // Total appointments
    const appointmentsResult = await db.query(
      'SELECT COUNT(*) as count FROM queue WHERE appointment_date IS NOT NULL'
    );
    stats.totalAppointments = parseInt(appointmentsResult.rows[0].count);
    
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get visit statistics for date range
router.get('/visits', async (req, res) => {
  try {
    const { timeRange } = req.query;
    let startDate, endDate = new Date();
    
    switch(timeRange) {
      case 'daily':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 6);
        break;
      case 'monthly':
        startDate = new Date();
        startDate.setDate(1);
        break;
      case 'yearly':
        startDate = new Date();
        startDate.setMonth(0, 1);
        break;
      default:
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 6);
    }
    
    const result = await db.query(
      `SELECT 
        COUNT(*) as total_visits,
        COUNT(CASE WHEN priority = 'Priority Case' THEN 1 END) as priority_cases,
        COUNT(CASE WHEN priority = 'Urgent' THEN 1 END) as urgent_cases,
        COUNT(CASE WHEN priority = 'Regular' THEN 1 END) as regular_cases
       FROM visit_log
       WHERE visit_date BETWEEN $1 AND $2`,
      [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch visit statistics' });
  }
});

// Get service category breakdown
router.get('/service-breakdown', async (req, res) => {
  try {
    const { timeRange } = req.query;
    let startDate, endDate = new Date();
    
    switch(timeRange) {
      case 'daily':
        startDate = new Date();
        break;
      case 'weekly':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 6);
        break;
      case 'monthly':
        startDate = new Date();
        startDate.setDate(1);
        break;
      case 'yearly':
        startDate = new Date();
        startDate.setMonth(0, 1);
        break;
      default:
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 6);
    }
    
    const result = await db.query(
      `SELECT service_category, COUNT(*) as count
       FROM visit_log
       WHERE visit_date BETWEEN $1 AND $2
       GROUP BY service_category
       ORDER BY count DESC`,
      [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch service breakdown' });
  }
});

// Get daily visits for the last 7 days
router.get('/daily-visits', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT visit_date, COUNT(*) as count
       FROM visit_log
       WHERE visit_date >= CURRENT_DATE - INTERVAL '6 days'
       GROUP BY visit_date
       ORDER BY visit_date`
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch daily visits' });
  }
});

// Get age distribution
router.get('/age-distribution', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        CASE 
          WHEN age <= 17 THEN '0-17'
          WHEN age <= 35 THEN '18-35'
          WHEN age <= 50 THEN '36-50'
          WHEN age <= 65 THEN '51-65'
          ELSE '65+'
        END as age_group,
        COUNT(*) as count
       FROM patients
       GROUP BY age_group
       ORDER BY age_group`
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch age distribution' });
  }
});

// Get comprehensive report data
router.get('/report', async (req, res) => {
  try {
    const { timeRange } = req.query;
    let startDate, endDate = new Date();
    
    switch(timeRange) {
      case 'daily':
        startDate = new Date();
        break;
      case 'weekly':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 6);
        break;
      case 'monthly':
        startDate = new Date();
        startDate.setDate(1);
        break;
      case 'yearly':
        startDate = new Date();
        startDate.setMonth(0, 1);
        break;
      default:
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 6);
    }
    
    // Get all visit log data for the period
    const visitsResult = await db.query(
      `SELECT * FROM visit_log_with_patient_details
       WHERE visit_date BETWEEN $1 AND $2
       ORDER BY visit_date DESC`,
      [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
    );
    
    res.json({
      timeRange,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      visits: visitsResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;
