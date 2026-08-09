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

  const phaseNum = maintenance ? 4 : Math.min(Math.max(weekNumber || 1, 1), 4);

  const pipelineGuide = `
GOAL PIPELINE — this program runs over 4 phases (one per week). This is week ${weekNumber || 1}, which is PHASE ${phaseNum}. Pick exercises from the correct phase below for their stated goal — do not skip ahead or fall behind the phase for this week:

- "Get my first pull-up":
  Phase 1: Towel Isometric Pulls (or Dead Hangs if a bar is available) + light grip work.
  Phase 2: Scapular Pulls, building on Phase 1.
  Phase 3: Incline Rows or Australian Rows (if a bar/sturdy setup is available) — if only floor space, continue Scapular Pulls and Towel Isometric Pulls at increased volume instead.
  Phase 4: Negative Pull-Ups (bar required) — if no bar is available, stay on Phase 3 exercises at increased difficulty instead, since a true negative pull-up needs a bar.

- "Do a full clean push-up":
  Phase 1: Wall Push-Ups.
  Phase 2: Incline Push-Ups.
  Phase 3: Knee Push-Ups and Negative Push-Ups.
  Phase 4: Full Clean Push-Ups.

- "Hold a handstand":
  Phase 1: Wrist Mobility/Wrist Rocks + Hollow Body Holds.
  Phase 2: Pike Holds.
  Phase 3: Elevated Pike Holds.
  Phase 4: Wall Walks / Chest-to-Wall Handstand Holds (needs a wall — always available regardless of equipment answer, since every home has a wall).

- "Just get generally strong": balanced rotation across Squats, push-up regressions appropriate to their fitness level, Planks, and Glute Bridges throughout all 4 phases, gradually increasing volume each week.

MANDATORY PREHAB INJECTION based on their limitation — add this as a warm-up before the main sets on every training day:
- "Thin wrists / weak grip": 2 sets of Wrist Palm Pulses + Cat-Cow Stretch + Wrist Rocks before main sets (use Wrist Rocks/Cat-Cow instead of Dead Hangs if no bar is available).
- "Old injury I'm working around": reduce set intensity by roughly 20%, use 90-second rest between sets instead of 60, and add a joint-mobilization cue to the safety tip.
- "Total beginner, nervous starting": keep exercises strictly to low-impact wall/incline variations with lower rep counts, no jumping into advanced progressions yet.
- "No limitations": no mandatory injection needed, proceed with the standard pipeline.

ENVIRONMENT CONSTRAINT — this is a HARD RULE, not a preference:
- "Nothing — just floor space": ABSOLUTELY NO bar-based or pull-up-bar exercises may appear anywhere in this plan — no Dead Hangs, no Negative Pull-Ups, no Bar Hangs, no Incline Rows requiring a bar. For any pulling movement, use ONLY Towel Isometric Pulls, Doorframe Rows, Scapular Pulls, or Floor Slides instead. Double-check every exercise before finalizing — if it requires a bar and they have none, replace it.
- "A wall or sturdy chair": Incline Push-Ups, Chair Dips, Chair Rows, and Wall Walks become available (still no bar-based exercises).
- "I have access to a bar": Dead Hangs, Bar Hangs, Incline Rows, and Negative Pull-Ups become available in addition to everything else.`;

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
