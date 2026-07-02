// Gemini model fallback chain.
// On free-tier quota errors (429 / RESOURCE_EXHAUSTED), automatically retries
// with the next model in the list before surfacing an error to the caller.
// gemini-2.5-flash and gemini-2.0-flash-lite have independent free-tier quotas.

const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash-lite"];

function isQuotaError(status, message) {
  return (
    status === 429 ||
    /resource.?exhausted|quota|rate.?limit/i.test(message || "")
  );
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

    if (!isQuotaError(res.status, msg)) throw lastErr; // hard error — don't retry
    // quota error — fall through to next model
  }

  throw lastErr;
}
