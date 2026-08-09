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
  Phase 2: Continued Towel Isometric Pulls at higher volume (or Scapular Pulls, a dead-hang variation, if a bar is available — Scapular Pulls REQUIRES a bar, never assign it to someone with no equipment).
  Phase 3: Doorframe Rows / Floor Slides at increased difficulty (or Incline Rows/Australian Rows if a bar/sturdy setup is available).
  Phase 4: Continued floor work at max difficulty (or Negative Pull-Ups if a bar is available — this REQUIRES a bar, never assign it without one).

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
- "Nothing — just floor space": ABSOLUTELY NO bar-based or pull-up-bar exercises may appear anywhere in this plan — no Dead Hangs, no Negative Pull-Ups, no Bar Hangs, no Scapular Pulls, no Incline Rows requiring a bar. Scapular Pulls specifically is a dead-hang variation performed ON A BAR — it is NOT a floor-only exercise. For any pulling movement, use ONLY Towel Isometric Pulls, Doorframe Rows, or Floor Slides instead. Double-check every exercise before finalizing — if it requires a bar and they have none, replace it.
- "A wall or sturdy chair": Incline Push-Ups, Chair Dips, Chair Rows, and Wall Walks become available (still no bar-based exercises).
- "I have access to a bar": Dead Hangs, Bar Hangs, Scapular Pulls, Incline Rows, and Negative Pull-Ups become available in addition to everything else.`;

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
LOCKED REFERENCE — if "Cat-Cow Stretch" appears anywhere in this plan, its cues MUST follow this exact order and never reverse it: Cat = round your spine UP toward the ceiling, tuck your chin, look toward your navel. Cow = drop your belly DOWN toward the floor, lift your chest and tailbone, look up toward the ceiling.
LOCKED REFERENCE — if "Scapular Pulls" appears anywhere in this plan, its cues MUST be exactly this (it is a bar hang exercise, never a floor exercise): "Hang from the bar with arms fully straight and shoulders relaxed in a dead hang.", "Without bending your elbows, depress and squeeze your shoulder blades down and back to lift your body slightly.", "Hold for 1-2 seconds at the top, then slowly lower back into a dead hang with full control."
LOCKED REFERENCE — if "Dead Hang" or "Bar Hangs" appears anywhere in this plan, its cues MUST describe hanging from a bar (NEVER a floor exercise): "Jump or step up to grip the bar with hands shoulder-width apart.", "Let your body hang fully, arms straight, shoulders relaxed away from your ears.", "Keep your body still with no swinging, breathing steadily until time is up."
LOCKED REFERENCE — if "Negative Pull-Up" appears anywhere in this plan, its cues MUST describe a bar exercise (NEVER a floor exercise): "Use a box, jump, or step to get your chin above the bar to start at the top.", "Slowly lower yourself down under control until your arms are fully straight — aim for a slow count of 3-5 seconds.", "Release, reset at the top, and repeat for each rep."
LOCKED REFERENCE — if "Incline Rows" appears anywhere in this plan, its cues MUST describe pulling the body toward a bar/bar-height surface (NEVER a floor exercise): "Set the bar at hip height, grip it, and walk your feet forward so your body is at an incline, heels on the ground.", "Keeping your body straight, pull your chest up toward the bar, leading with your elbows.", "Lower back down with control until your arms are fully straight."
CRITICAL: for every exercise in this plan, before writing its cues, first confirm whether it requires a bar (hanging) or is a floor/wall exercise, and make sure the cues physically match — never describe lying down for a hanging exercise, and never describe hanging for a floor exercise.
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
