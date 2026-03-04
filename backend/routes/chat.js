const express = require("express");
const Groq = require("groq-sdk");
const { pool } = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are an Institutional Knowledge Guardian AI assistant. You help employees surface organizational knowledge.

You have access to the following knowledge base:

<knowledge_base>
{KNOWLEDGE}
</knowledge_base>

Rules:
1. Ground ALL answers in the knowledge base above
2. Always cite which document/source each piece of information came from
3. If something isn't in the knowledge base, say clearly: "I don't have information about that yet."
4. Highlight WARNINGS or critical caveats prominently
5. Be concise but complete
6. If multiple sources mention the same topic, synthesize them`;

// POST /chat
router.post("/", authMiddleware, async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    const result = await pool.query(
      `SELECT ki.*, d.name as source_name
       FROM knowledge_items ki
       LEFT JOIN documents d ON ki.document_id = d.id
       WHERE ki.user_id = $1
       ORDER BY ki.created_at DESC`,
      [req.user.id]
    );

    const items = result.rows;
    const knowledgeSummary = items.length > 0
      ? items.map(item =>
          `[Source: ${item.source_name}] ${item.type.toUpperCase()}: ${item.title}\n${item.details}`
        ).join("\n\n---\n\n")
      : "No documents have been uploaded yet.";

    const systemPrompt = SYSTEM_PROMPT.replace("{KNOWLEDGE}", knowledgeSummary);

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: message }
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1000,
      temperature: 0.3,
      messages,
    });

    const reply = completion.choices[0]?.message?.content || "No response generated.";
    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Chat failed" });
  }
});

module.exports = router;
