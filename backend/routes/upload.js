const express = require("express");
const multer = require("multer");
const Groq = require("groq-sdk");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");
const { pool } = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const EXTRACT_PROMPT = `You are an AI that extracts structured institutional knowledge from raw documents.

Given this raw text from a document labeled "{SOURCE_NAME}", extract ALL key knowledge items as JSON:

{
  "knowledge_items": [
    {
      "type": "decision|process|technical_fact|best_practice|warning|contact",
      "title": "short descriptive title",
      "details": "full context with all relevant information",
      "actors": ["people or teams involved"],
      "confidence": 0.0-1.0
    }
  ]
}

Return ONLY valid JSON. No markdown, no backticks, no explanation. Extract every important decision, process, technical detail, warning, and contact info.

Document text:
{TEXT}`;

const extractText = async (buffer, filename) => {
  const ext = filename.split(".").pop().toLowerCase();

  switch (ext) {
    case "docx":
      const docxResult = await mammoth.extractRawText({ buffer });
      return docxResult.value;

    case "pdf":
      const pdfResult = await pdfParse(buffer);
      return pdfResult.text;

    case "json":
      try {
        const parsed = JSON.parse(buffer.toString("utf-8"));
        return JSON.stringify(parsed, null, 2);
      } catch {
        return buffer.toString("utf-8");
      }

    case "csv":
      // Convert CSV to readable text
      const csvText = buffer.toString("utf-8");
      const lines = csvText.split("\n").filter(l => l.trim());
      if (lines.length === 0) return csvText;
      const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
      const rows = lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.trim().replace(/"/g, ""));
        return headers.map((h, i) => `${h}: ${values[i] || ""}`).join(" | ");
      });
      return `CSV Data:\nColumns: ${headers.join(", ")}\n\n${rows.join("\n")}`;

    case "html":
      // Strip HTML tags for plain text
      const htmlText = buffer.toString("utf-8");
      return htmlText
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // txt, md, js, py, log and everything else — plain utf-8
    default:
      return buffer.toString("utf-8");
  }
};

router.post("/", authMiddleware, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file provided" });

  const fileName = req.file.originalname;

  try {
    const fileText = await extractText(req.file.buffer, fileName);
    const truncated = fileText.slice(0, 12000);

    const prompt = EXTRACT_PROMPT
      .replace("{SOURCE_NAME}", fileName)
      .replace("{TEXT}", truncated);

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 4000,
      temperature: 0.1,
      messages: [{ role: "user", content: prompt }],
    });

    let raw = completion.choices[0]?.message?.content || "";
    let clean = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      const lastComplete = clean.lastIndexOf("},");
      if (lastComplete > 0) clean = clean.slice(0, lastComplete + 1) + "\n  ]\n}";
      parsed = JSON.parse(clean);
    }

    const items = parsed.knowledge_items || [];

    const docResult = await pool.query(
      "INSERT INTO documents (user_id, name, size, item_count) VALUES ($1, $2, $3, $4) RETURNING *",
      [req.user.id, fileName, req.file.size, items.length]
    );
    const doc = docResult.rows[0];

    const savedItems = [];
    for (const item of items) {
      const result = await pool.query(
        `INSERT INTO knowledge_items (document_id, user_id, type, title, details, actors, confidence)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [doc.id, req.user.id, item.type, item.title, item.details, item.actors || [], item.confidence || 0.8]
      );
      savedItems.push(result.rows[0]);
    }

    res.json({ document: doc, items: savedItems });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message || "Failed to process file" });
  }
});

module.exports = router;