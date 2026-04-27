import { supabase } from "../lib/supabase.js";

export default async function handler(req, res) {
  const userId = req.headers["x-user-id"]; // replace with real auth later

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  const { data: shifts } = await supabase
    .from("shifts")
    .select("*")
    .eq("user_id", userId);

  res.json({
    user: userId,
    isPremium: profile?.is_premium ?? false,
    shifts: shifts ?? []
  });
}import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET);

export default async function handler(req, res) {
  const userId = req.headers["x-user-id"];

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      { price: process.env.STRIPE_PRICE_ID, quantity: 1 }
    ],
    client_reference_id: userId,
    success_url: `${req.headers.origin}?success=1`,
    cancel_url: `${req.headers.origin}?cancel=1`
  });

  res.json({ url: session.url });
}import { supabase } from "../lib/supabase.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET);

export default async function handler(req, res) {
  const event = req.body;

  if (event.type === "checkout.session.completed") {
    const userId = event.data.object.client_reference_id;

    await supabase
      .from("profiles")
      .update({
        is_premium: true,
        last_stripe_event_id: event.id
      })
      .eq("id", userId);
  }

  res.json({ received: true });
}import { supabase } from "../lib/supabase.js";
import { buildHash } from "../lib/hash.js";
import { calculateNet } from "../lib/tax-engine.js";

export default async function handler(req, res) {
  const userId = req.headers["x-user-id"];

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_premium")
    .eq("id", userId)
    .single();

  if (!profile?.is_premium) {
    return res.status(403).send("Upgrade required");
  }

  const { data: shifts } = await supabase
    .from("shifts")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true });

  const normalized = shifts.map(s => ({
    id: s.id,
    h: s.hours,
    r: s.rate_cents,
    n: s.net_cents
  }));

  const hash = buildHash(normalized);

  const csv =
    "date,hours,rate_cents,net_cents\n" +
    shifts.map(s =>
      `${s.date},${s.hours},${s.rate_cents},${s.net_cents}`
    ).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("X-Audit-Hash", hash);
  res.send(csv);
}
