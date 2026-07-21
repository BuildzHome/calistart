module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { imageBase64, mediaType } = req.body;

  const prompt = `You're a calisthenics form coach. Look at this photo of someone mid-exercise. In under 120 words: name the exercise if identifiable, point out 1-2 specific things about their form (alignment, joint angles, positioning), and give one clear fix. Be direct but encouraging. Plain text, no markdown.`;

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
