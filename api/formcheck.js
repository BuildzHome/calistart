module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { imageBase64, mediaType } = req.body;

  const prompt = `You're a calisthenics form coach. Look at this photo of someone mid-exercise.

Respond with EXACTLY 3 short lines, nothing else — no intro, no exercise name header, no extra commentary:
🟢 [one short phrase — what they're doing right]
🔴 [one short phrase — the main thing to fix]
💡 [one short phrase — a quick cue to fix it]

Each line must be under 12 words. Be specific and direct, not generic. Plain text, no markdown, no asterisks.`;

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
    res.status(200).json({ result: text });
  } catch (e) {
    res.status(500).json({ error: e.message || "Something went wrong" });
  }
};
