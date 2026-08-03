module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { imageBase64, mediaType } = req.body;

  const prompt = `You're a calisthenics form coach. Look at this photo of someone attempting an exercise.

First, check if their FULL BODY is visible in the frame (head to feet, not cropped). If it's not — too zoomed in, cropped, or the camera is at a bad angle to judge form — set fullBodyVisible to false.

If the full body IS visible, estimate a form quality score from 0-100 based on alignment, joint angles, and positioning for whatever exercise they appear to be doing.

Return ONLY valid JSON, no markdown fences, no commentary, matching this exact shape:
{
  "fullBodyVisible": true or false,
  "formScore": a number 0-100 (only meaningful if fullBodyVisible is true, otherwise 0),
  "positiveNote": "one short encouraging sentence, under 12 words, about what they're doing well",
  "topFix": "the single most important physical adjustment to make, under 12 words, specific and direct"
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
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 } },
              { type: "text", text: prompt },
            ],
          },
        ],
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
