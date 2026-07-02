export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("upstream error");
    const data = await res.json();
    const rates = data.rates || {};
    const ngnPerUsd = rates.NGN || 0;
    const eurPerUsd = rates.EUR || 0;
    const gbpPerUsd = rates.GBP || 0;
    const payload = {
      usdNgn: Math.round(ngnPerUsd),
      eurNgn: eurPerUsd > 0 ? Math.round(ngnPerUsd / eurPerUsd) : 0,
      gbpNgn: gbpPerUsd > 0 ? Math.round(ngnPerUsd / gbpPerUsd) : 0,
      updatedUtc: data.time_last_update_utc || new Date().toUTCString(),
    };
    return Response.json(payload);
  } catch {
    return Response.json({ error: "Rates unavailable" }, { status: 502 });
  }
}
