module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: "Missing userId" });
    return;
  }

  const origin = `https://${req.headers.host}`;

  try {
    const params = new URLSearchParams();
    params.append("mode", "subscription");
    params.append("line_items[0][price]", "price_1Twp6JEFYGlufNmldUoUAgEJ");
    params.append("line_items[0][quantity]", "1");
    params.append("success_url", `${origin}/?success=true`);
    params.append("cancel_url", `${origin}/`);
    params.append("client_reference_id", userId);

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await response.json();
    if (!response.ok) {
      res.status(500).json({ error: session.error?.message || "Stripe error" });
      return;
    }

    res.status(200).json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message || "Something went wrong" });
  }
};
