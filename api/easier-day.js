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
}
LOCKED REFERENCE — if "Cat-Cow Stretch" appears anywhere in this plan, its cues MUST follow this exact order and never reverse it: Cat = round your spine UP toward the ceiling, tuck your chin, look toward your navel. Cow = drop your belly DOWN toward the floor, lift your chest and tailbone, look up toward the ceiling.
LOCKED REFERENCE — if "Scapular Pulls" appears anywhere in this plan, its cues MUST be exactly this (it is a bar hang exercise, never a floor exercise): "Hang from the bar with arms fully straight and shoulders relaxed in a dead hang.", "Without bending your elbows, depress and squeeze your shoulder blades down and back to lift your body slightly.", "Hold for 1-2 seconds at the top, then slowly lower back into a dead hang with full control."
LOCKED REFERENCE — if "Dead Hang" or "Bar Hangs" appears anywhere in this plan, its cues MUST describe hanging from a bar (NEVER a floor exercise): "Jump or step up to grip the bar with hands shoulder-width apart.", "Let your body hang fully, arms straight, shoulders relaxed away from your ears.", "Keep your body still with no swinging, breathing steadily until time is up."
LOCKED REFERENCE — if "Negative Pull-Up" appears anywhere in this plan, its cues MUST describe a bar exercise (NEVER a floor exercise): "Use a box, jump, or step to get your chin above the bar to start at the top.", "Slowly lower yourself down under control until your arms are fully straight — aim for a slow count of 3-5 seconds.", "Release, reset at the top, and repeat for each rep."
LOCKED REFERENCE — if "Incline Rows" appears anywhere in this plan, its cues MUST describe pulling the body toward a bar/bar-height surface (NEVER a floor exercise): "Set the bar at hip height, grip it, and walk your feet forward so your body is at an incline, heels on the ground.", "Keeping your body straight, pull your chest up toward the bar, leading with your elbows.", "Lower back down with control until your arms are fully straight."
CRITICAL: for every exercise in this plan, before writing its cues, first confirm whether it requires a bar (hanging) or is a floor/wall exercise, and make sure the cues physically match — never describe lying down for a hanging exercise, and never describe hanging for a floor exercise.`;

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
