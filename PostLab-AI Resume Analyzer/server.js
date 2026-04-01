import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const API_KEY = process.env.OPENAI_API_KEY; // 🔐 keep in env

app.post("/analyze", async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    const prompt = `
Return ONLY valid JSON:

{
  "overallScore": number,
  "ATS": { "score": number, "tips": [] },
  "content": { "score": number, "tips": [] },
  "skills": { "score": number, "tips": [] }
}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: resumeText + "\n\nJD:\n" + jobDescription }
        ]
      })
    });

    const data = await response.json();

    let content = data.choices?.[0]?.message?.content || "{}";
    content = content.replace(/```json|```/g, "").trim();

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      result = { overallScore: 50 };
    }

    // 🔥 basic rule boost
    if (!resumeText.match(/\d+%|\d+x/)) {
      result.overallScore -= 10;
    }

    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));