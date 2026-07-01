import { NextResponse } from "next/server";

// Proxy for free exchange rate API — avoids CORS issues and caches server-side.
// open.er-api.com updates hourly with no API key needed.
export async function GET() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 300 }, // revalidate every 5 minutes
    });
    if (!res.ok) throw new Error(`Upstream API returned ${res.status}`);

    const data = await res.json();
    if (data.result !== "success") throw new Error("API returned non-success result");

    const { NGN, EUR, GBP } = data.rates;
    if (!NGN || !EUR || !GBP) throw new Error("Missing expected currency rates");

    return NextResponse.json({
      usdNgn: NGN,
      eurNgn: NGN / EUR,
      gbpNgn: NGN / GBP,
      updatedAt: data.time_last_update_utc || null,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
