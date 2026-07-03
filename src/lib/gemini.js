// Gemini model fallback chain.
// On free-tier quota errors (429 / RESOURCE_EXHAUSTED), automatically retries
// with the next model in the list. Each model has its own independent free-tier
// quota, so chaining them multiplies total headroom before any error surfaces.
// NOTE: gemini-2.0-flash, gemini-2.0-flash-lite shut down June 1 2026.
//       gemini-1.5-flash shut down / not found as of July 2026.
//       gemini-2.5-flash-8b does not exist for generateContent — it 404s and
//       was being used as a fallback, turning every quota error into a hard
//       "model not found" failure instead of surfacing the real quota message.
const FALLBACK_MODELS = [
  "gemini-2.5-flash",        //  5 RPM — primary
  "gemini-2.5-flash-lite",   // 10 RPM — lighter free-tier model
];

function isRetryableError(status, message) {
  return (
    status === 429 ||
    status === 404 ||   // model not found / deprecated — try next in chain
    /resource.?exhausted|quota|rate.?limit/i.test(message || "") ||
    /modality.*not.*enabled|input modality.*not.*enabled|not.*support.*image/i.test(message || "") ||
    /not found for api version|is not supported for/i.test(message || "")
  );
}

// Keep old name for cleanGeminiError call-sites
function isQuotaError(status, message) {
  return /resource.?exhausted|quota|rate.?limit/i.test(message || "") || status === 429;
}

export function cleanGeminiError(message) {
  if (isQuotaError(null, message)) {
    const secs = (message || "").match(/retry in ([\d.]+)s/i)?.[1];
    return secs
      ? `Gemini free-tier limit hit. Try again in ${Math.ceil(parseFloat(secs))} seconds, or switch to a paid key in Settings.`
      : "Gemini free-tier limit hit. Wait a minute and try again, or add a paid key in Settings.";
  }
  return message || "Gemini error";
}

/**
 * Call Gemini with automatic model fallback on quota errors.
 * @param {string} key  - Gemini API key
 * @param {object} body - Request body (model-agnostic; only the URL changes per model)
 * @returns {Promise<string>} The text content of the first candidate part
 */
export async function callGemini(key, body) {
  let lastErr = null;

  for (const model of FALLBACK_MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      },
    );
    const data = await res.json();

    if (res.ok) {
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    const msg = data.error?.message || `Gemini error (HTTP ${res.status})`;
    lastErr    = new Error(cleanGeminiError(msg));

    if (!isRetryableError(res.status, msg)) throw lastErr; // hard error — don't retry
    // quota error — fall through to next model
  }

  throw lastErr;
}
