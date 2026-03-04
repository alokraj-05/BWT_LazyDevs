const express = require("express");
const { pool } = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// GET /knowledge — fetch all items for logged-in user, optional search
router.get("/", authMiddleware, async (req, res) => {
  const { search, type } = req.query;
  try {
    let query = `
      SELECT ki.*, d.name as source_name
      FROM knowledge_items ki
      LEFT JOIN documents d ON ki.document_id = d.id
      WHERE ki.user_id = $1
    `;
    const params = [req.user.id];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (ki.title ILIKE $${params.length} OR ki.details ILIKE $${params.length})`;
    }
    if (type) {
      params.push(type);
      query += ` AND ki.type = $${params.length}`;
    }

    query += " ORDER BY ki.created_at DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch knowledge items" });
  }
});

// GET /knowledge/documents — fetch all documents for logged-in user
router.get("/documents", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM documents WHERE user_id = $1 ORDER BY uploaded_at DESC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// DELETE /knowledge/:id — delete a knowledge item
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM knowledge_items WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete item" });
  }
});

// DELETE /knowledge/document/:id — delete a document and all its items
router.delete("/document/:id", authMiddleware, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM documents WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete document" });
  }
});

module.exports = router;
