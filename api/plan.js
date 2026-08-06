module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { goalLabel, limitationLabel, equipmentLabel, weekNumber, previousWeekSummary, maintenance } = req.body;

  const progressionBlock = maintenance
    ? `\nThis person has already completed their full program and achieved their goal: ${goalLabel}. Here is what they did last week:\n${previousWeekSummary}\n\nThis is a MAINTENANCE week — the goal is to keep their skill sharp, not to keep increasing difficulty. Keep exercises at roughly the same level as last week (don't push harder), and it's fine to use fewer sessions per week if appropriate for upkeep.`
    : previousWeekSummary
    ? `\nThis is week ${weekNumber} of an ongoing program toward the same goal. Here is what they did last week:\n${previousWeekSummary}\n\nYou MUST make a concrete, noticeable increase from last week for every exercise that repeats — add at least 2-3 more reps, or at least 5-10 more seconds to any hold/duration, or add one extra set, OR move them to the next exercise in their goal pipeline if they've clearly mastered the current one. Do not repeat the exact same numbers as last week under any circumstance. State the specific improvement in the intro (e.g., "up from 5 to 8 reps", or "moving from Incline Push-Ups to Knee Push-Ups").`
    : "";

  const pipelineGuide = `
GOAL PIPELINE — choose exercises progressing along the correct pipeline for their stated goal, picking the appropriate stage for week ${weekNumber || 1} of their program (early weeks = earlier stage, later weeks = further along):
- "Get my first pull-up": Scapular Pulls → Dead Hangs → Australian/Bodyweight Rows (if a bar is available) or Towel Isometric Pulls (if floor space only) → Negative Pull-Ups.
- "Do a full clean push-up": Wall Push-Ups → Incline Push-Ups → Knee Push-Ups → Negative Full Push-Ups → Standard Push-Ups.
- "Hold a handstand": Wrist Mobility (Cat-Cow, Wrist Rocks) → Hollow Body Holds → Pike Hold / Elevated Pike Hold → Wall Chest-to-Wall Handstand Holds.
- "Just get generally strong": balanced rotation across Squats, push-up regressions, Planks, and Glute Bridges.

MANDATORY PREHAB INJECTION based on their limitation — add this as a warm-up before the main sets on every training day:
- "Thin wrists / weak grip": 2 sets of Wrist Palm Pulses + Cat-Cow Stretch + Dead Hangs/Wrist Rocks before main sets.
- "Old injury I'm working around": reduce set intensity by roughly 20%, use 90-second rest between sets instead of 60, and add a joint-mobilization cue to the safety tip.
- "Total beginner, nervous starting": keep exercises strictly to low-impact wall/incline variations with lower rep counts, no jumping into advanced progressions yet.
- "No limitations": no mandatory injection needed, proceed with the standard pipeline.

ENVIRONMENT ADJUSTMENT based on equipment available:
- "Nothing — just floor space": use only floor/wall progressions — Doorframe Rows, Floor Slides, Pike Holds, wall-based work.
- "A wall or sturdy chair": Incline Push-Ups, Chair Dips, Chair Rows, and Wall Walks become available.
- "I have access to a bar": Bar Hangs, Incline Rows, and Negative Pull-Ups become available.`;

  const prompt = `You are a calm, encouraging calisthenics coach for a total beginner, using real, scientifically grounded progression pipelines — not generic or randomly chosen exercises.
Goal: ${goalLabel}
Limitation: ${limitationLabel}
Equipment available: ${equipmentLabel}
${pipelineGuide}
${progressionBlock}

Return ONLY valid JSON, no markdown fences, no commentary, matching this exact shape:
{
  "intro": "one warm sentence addressing their specific limitation directly${previousWeekSummary ? ", acknowledging their progress so far" : ""}",
  "days": [
    { "day": "Day 1", "isRestDay": false, "exercises": [ { "name": "exact exercise name from the pipeline/prehab/environment rules above", "detail": "sets/reps or duration", "cues": ["short step-by-step form cue 1", "short form cue 2", "short form cue 3"] } ] }
  ],
  "safetyTip": "one safety tip specific to their limitation"
}
Include 7 days, with 1-2 rest days marked "isRestDay": true (exercises array empty on rest days). Use 2-4 exercises per training day, including any mandatory prehab injection exercises first if applicable. Only use exercises unlocked by their stated equipment. Give every exercise 2-3 short, specific form cues in the "cues" array — these are shown to the user as step-by-step instructions, so make them genuinely useful, not generic.
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
