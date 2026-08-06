module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { currentExercises, limitationLabel, equipmentLabel } = req.body;

  const exerciseList = currentExercises.map(e => `${e.name} (${e.detail})`).join(", ");

  const prompt = `A total beginner attempted these calisthenics exercises but couldn't complete them: ${exerciseList}.
Their limitation: ${limitationLabel}
Equipment available: ${equipmentLabel}

Give them an easier scale-down version of the SAME workout — same number of exercises. Every single exercise MUST be measurably easier than what's listed above: either a genuinely different, more assisted/regressed variation from the correct progression pipeline (e.g. Incline Push-Up → Wall Push-Up, Negative Pull-Up → Dead Hang, Standard Push-Up → Knee Push-Up), OR the same exercise with noticeably reduced reps/hold time (at least 30-40% less than before). Do NOT return the same exercise name with the same numbers as before — that is not acceptable. Prefer switching to a genuinely different, easier movement over just lowering numbers on the same one.

Return ONLY valid JSON, no markdown fences, no commentary, matching this exact shape:
{
  "exercises": [ { "name": "exact exercise name", "detail": "sets/reps or duration", "cues": ["short form cue 1", "short form cue 2"] } ]
}`;

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
