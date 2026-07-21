module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { goalLabel, limitationLabel, equipmentLabel, poseKeys } = req.body;

  const prompt = `You are a calm, encouraging calisthenics coach for a total beginner.
Goal: ${goalLabel}
Limitation: ${limitationLabel}
Equipment available: ${equipmentLabel}

Return ONLY valid JSON, no markdown fences, no commentary, matching this exact shape:
{
  "intro": "one warm sentence addressing their specific limitation directly",
  "days": [
    { "day": "Day 1", "exercises": [ { "name": "short exercise name", "detail": "sets/reps or duration", "poseKey": "one of: ${poseKeys}" } ] }
  ],
  "safetyTip": "one safety tip specific to their limitation"
}
Include 7 days. Use 2-3 exercises per day, fewer on rest days (use poseKey "rest" for rest days). Only use equipment they said they have. Pick the closest matching poseKey from the provided list for each exercise — never invent a new key.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1400,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      res.status(500).json({ error: data.error?.message || "API error" });
      return;
    }
    const text = data.content?.find((b) => b.type === "text")?.text || "";
    let cleaned = text.replace(/```json|```/g, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
    const parsed = JSON.parse(cleaned);
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message || "Something went wrong" });
  }
};
