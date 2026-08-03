module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { goalLabel, limitationLabel, equipmentLabel, poseKeys, weekNumber, previousWeekSummary, maintenance } = req.body;

  const progressionBlock = maintenance
    ? `\nThis person has already completed their full program and achieved their goal: ${goalLabel}. Here is what they did last week:\n${previousWeekSummary}\n\nThis is a MAINTENANCE week — the goal is to keep their skill sharp, not to keep increasing difficulty. Keep exercises at roughly the same level as last week (don't push harder), and it's fine to use fewer sessions per week if appropriate for upkeep.`
    : previousWeekSummary
    ? `\nThis is week ${weekNumber} of an ongoing program toward the same goal. Here is what they did last week:\n${previousWeekSummary}\n\nYou MUST make a concrete, noticeable increase from last week for every exercise that repeats — add at least 2-3 more reps, or at least 5-10 more seconds to any hold/duration, or add one extra set. Do not repeat the exact same numbers as last week under any circumstance. If an exercise was mastered easily, replace it with a harder variation from the allowed pose list instead. State the specific improvement in the intro (e.g., "up from 5 to 8 reps").`
    : "";

  const prompt = `You are a calm, encouraging calisthenics coach for a total beginner.
Goal: ${goalLabel}
Limitation: ${limitationLabel}
Equipment available: ${equipmentLabel}
${progressionBlock}

Return ONLY valid JSON, no markdown fences, no commentary, matching this exact shape:
{
  "intro": "one warm sentence addressing their specific limitation directly${previousWeekSummary ? ", acknowledging their progress so far" : ""}",
  "days": [
    { "day": "Day 1", "exercises": [ { "name": "short exercise name", "detail": "sets/reps or duration", "poseKey": "one of: ${poseKeys}" } ] }
  ],
  "safetyTip": "one safety tip specific to their limitation"
}
Include 7 days. Use 2-3 exercises per day, fewer on rest days (use poseKey "rest" for rest days). Only use equipment they said they have. Pick the closest matching poseKey from the provided list for each exercise — never invent a new key.
CRITICAL: Never use the double-quote/inch symbol (") anywhere inside any text value — write "inches" in full instead of ". Never put any double-quote character inside a string value, as it will break the JSON.`;

  const maxAttempts = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        lastError = data.error?.message || "API error";
        continue;
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
      return;
    } catch (e) {
      lastError = e.message || "Something went wrong";
      // loop again and retry
    }
  }

  res.status(500).json({ error: `Failed after ${maxAttempts} attempts: ${lastError}` });
};
