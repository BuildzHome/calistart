module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { currentExercises, limitationLabel, equipmentLabel, poseKeys } = req.body;

  const exerciseList = currentExercises.map(e => `${e.name} (${e.detail})`).join(", ");

  const prompt = `A total beginner attempted these calisthenics exercises but couldn't complete them: ${exerciseList}.
Their limitation: ${limitationLabel}
Equipment available: ${equipmentLabel}

Give them an easier scale-down version of the SAME workout — same number of exercises, but genuinely less demanding (e.g. swap a full wall walk for an elevated pike hold on a chair/bed, reduce hold times, use assisted variations).

Return ONLY valid JSON, no markdown fences, no commentary, matching this exact shape:
{
  "exercises": [ { "name": "short exercise name", "detail": "sets/reps or duration", "poseKey": "one of: ${poseKeys}" } ]
}
Pick the closest matching poseKey from the provided list for each exercise — never invent a new key.`;

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
        max_tokens: 600,
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
