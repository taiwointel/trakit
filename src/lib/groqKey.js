// Single system-wide Groq key — every account shares this, no per-user
// setup required. Set GROQ_API_KEY in the deployment environment.
export function getGroqKey() {
  return process.env.GROQ_API_KEY || null;
}
