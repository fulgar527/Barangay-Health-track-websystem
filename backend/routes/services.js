const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all service categories
router.get('/categories', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM service_categories ORDER BY category_name'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch service categories' });
  }
});

// Get all services with categories
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, sc.category_name, sc.urgency as category_urgency
       FROM services s
       JOIN service_categories sc ON s.category_id = sc.category_id
       ORDER BY sc.category_name, s.service_name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Get services by category
router.get('/category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const result = await db.query(
      'SELECT * FROM services WHERE category_id = $1 ORDER BY service_name',
      [categoryId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch services for category' });
  }
});

// Get hierarchical structure (categories with services)
router.get('/hierarchy', async (req, res) => {
  try {
    const categoriesResult = await db.query(
      'SELECT * FROM service_categories ORDER BY category_name'
    );
    
    const servicesResult = await db.query(
      'SELECT * FROM services ORDER BY service_name'
    );
    
    const hierarchy = categoriesResult.rows.map(category => ({
      ...category,
      services: servicesResult.rows.filter(
        service => service.category_id === category.category_id
      )
    }));
    
    res.json(hierarchy);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch service hierarchy' });
  }
});

module.exports = router;
