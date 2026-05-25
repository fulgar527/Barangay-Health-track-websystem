const express = require('express');
const router = express.Router();
const db = require('../db');

// ── GET /api/service-categories — list all categories with their services ──
router.get('/', async (req, res) => {
  try {
    const cats = await db.query(
      `SELECT c.id, c.category_name, c.urgency, c.is_active, c.sort_order,
              COALESCE(json_agg(
                json_build_object(
                  'id', s.id,
                  'service_name', s.service_name,
                  'default_priority', s.default_priority,
                  'is_active', s.is_active,
                  'sort_order', s.sort_order
                ) ORDER BY s.sort_order
              ) FILTER (WHERE s.id IS NOT NULL), '[]') AS services
       FROM service_categories c
       LEFT JOIN services s ON s.category_id = c.id
       GROUP BY c.id
       ORDER BY c.sort_order, c.category_name`
    );
    res.json(cats.rows || cats);
  } catch (err) {
    console.error('GET /service-categories error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/service-categories — create a new category ──
router.post('/', async (req, res) => {
  try {
    const { categoryName, urgency, services } = req.body;
    if (!categoryName) return res.status(400).json({ error: 'Category name is required' });

    // Get next sort order
    const maxOrder = await db.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM service_categories');
    const nextOrder = (maxOrder.rows || maxOrder)[0].next;

    const catResult = await db.query(
      'INSERT INTO service_categories (category_name, urgency, sort_order) VALUES ($1, $2, $3) RETURNING *',
      [categoryName.trim(), urgency || 'Non-Urgent', nextOrder]
    );
    const cat = (catResult.rows || catResult)[0];

    // Insert services if provided
    if (services && Array.isArray(services) && services.length > 0) {
      for (let i = 0; i < services.length; i++) {
        const svc = services[i];
        if (svc.serviceName || svc.service_name) {
          await db.query(
            'INSERT INTO services (category_id, service_name, default_priority, sort_order) VALUES ($1, $2, $3, $4)',
            [cat.id, (svc.serviceName || svc.service_name).trim(), svc.defaultPriority || svc.default_priority || 'Regular', i + 1]
          );
        }
      }
    }

    // Return category with services
    const result = await db.query(
      `SELECT c.id, c.category_name, c.urgency, c.is_active, c.sort_order,
              COALESCE(json_agg(
                json_build_object('id', s.id, 'service_name', s.service_name, 'default_priority', s.default_priority, 'is_active', s.is_active, 'sort_order', s.sort_order)
                ORDER BY s.sort_order
              ) FILTER (WHERE s.id IS NOT NULL), '[]') AS services
       FROM service_categories c LEFT JOIN services s ON s.category_id = c.id
       WHERE c.id = $1 GROUP BY c.id`, [cat.id]
    );
    res.status(201).json((result.rows || result)[0]);
  } catch (err) {
    if (err.message?.includes('unique') || err.code === '23505') {
      return res.status(409).json({ error: 'A category with this name already exists.' });
    }
    console.error('POST /service-categories error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/service-categories/:id — update category + its services ──
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryName, urgency, isActive, services } = req.body;

    await db.query(
      'UPDATE service_categories SET category_name = COALESCE($1, category_name), urgency = COALESCE($2, urgency), is_active = COALESCE($3, is_active) WHERE id = $4',
      [categoryName?.trim(), urgency, isActive, id]
    );

    // Replace services if provided
    if (services && Array.isArray(services)) {
      // Delete old services
      await db.query('DELETE FROM services WHERE category_id = $1', [id]);
      // Insert new ones
      for (let i = 0; i < services.length; i++) {
        const svc = services[i];
        const name = svc.serviceName || svc.service_name;
        if (name) {
          await db.query(
            'INSERT INTO services (category_id, service_name, default_priority, sort_order) VALUES ($1, $2, $3, $4)',
            [id, name.trim(), svc.defaultPriority || svc.default_priority || 'Regular', i + 1]
          );
        }
      }
    }

    // Return updated category with services
    const result = await db.query(
      `SELECT c.id, c.category_name, c.urgency, c.is_active, c.sort_order,
              COALESCE(json_agg(
                json_build_object('id', s.id, 'service_name', s.service_name, 'default_priority', s.default_priority, 'is_active', s.is_active, 'sort_order', s.sort_order)
                ORDER BY s.sort_order
              ) FILTER (WHERE s.id IS NOT NULL), '[]') AS services
       FROM service_categories c LEFT JOIN services s ON s.category_id = c.id
       WHERE c.id = $1 GROUP BY c.id`, [id]
    );
    res.json((result.rows || result)[0]);
  } catch (err) {
    if (err.message?.includes('unique') || err.code === '23505') {
      return res.status(409).json({ error: 'A category with this name already exists.' });
    }
    console.error('PUT /service-categories error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/service-categories/:id — delete category and its services ──
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM service_categories WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /service-categories error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/service-categories/:id/services — add a service to a category ──
router.post('/:id/services', async (req, res) => {
  try {
    const { id } = req.params;
    const { serviceName, defaultPriority } = req.body;
    if (!serviceName) return res.status(400).json({ error: 'Service name is required' });

    const maxOrder = await db.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM services WHERE category_id = $1', [id]);
    const nextOrder = (maxOrder.rows || maxOrder)[0].next;

    const result = await db.query(
      'INSERT INTO services (category_id, service_name, default_priority, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, serviceName.trim(), defaultPriority || 'Regular', nextOrder]
    );
    res.status(201).json((result.rows || result)[0]);
  } catch (err) {
    if (err.message?.includes('unique') || err.code === '23505') {
      return res.status(409).json({ error: 'This service already exists in this category.' });
    }
    console.error('POST /service-categories/:id/services error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/service-categories/:catId/services/:svcId — remove a service ──
router.delete('/:catId/services/:svcId', async (req, res) => {
  try {
    await db.query('DELETE FROM services WHERE id = $1 AND category_id = $2', [req.params.svcId, req.params.catId]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE service error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
