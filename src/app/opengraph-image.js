import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "linear-gradient(135deg, #0F0A1E 0%, #1E1B4B 40%, #0F172A 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top gradient accent bar */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 6,
          background: "linear-gradient(90deg, #C8862E, #A9854F)",
          display: "flex",
        }} />

        {/* Decorative background circles */}
        <div style={{
          position: "absolute", top: -120, right: -120,
          width: 500, height: 500, borderRadius: "50%",
          background: "rgba(169,133,79,0.07)", display: "flex",
        }} />
        <div style={{
          position: "absolute", bottom: -80, left: -80,
          width: 350, height: 350, borderRadius: "50%",
          background: "rgba(91,143,168,0.08)", display: "flex",
        }} />

        {/* Logo mark */}
        <div style={{
          width: 90, height: 90, borderRadius: 22,
          background: "#15191F", border: "2px solid #A9854F",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 28,
        }}>
          <div style={{
            fontFamily: "monospace", fontSize: 38, fontWeight: 700,
            color: "#ECE9E1", display: "flex", letterSpacing: -1,
          }}>
            <span style={{ color: "#ECE9E1" }}>T</span>
            <span style={{ color: "#A9854F" }}>7</span>
          </div>
        </div>

        {/* App name */}
        <div style={{
          fontFamily: "Georgia, serif",
          fontSize: 72,
          fontWeight: 700,
          color: "#F5A623",
          letterSpacing: -2,
          lineHeight: 1,
          display: "flex",
        }}>
          Trakit7
        </div>

        {/* Tagline */}
        <div style={{
          fontFamily: "Arial, sans-serif",
          fontSize: 28,
          color: "rgba(255,255,255,0.65)",
          marginTop: 18,
          letterSpacing: 0.5,
          display: "flex",
        }}>
          Track every naira. Know your net worth.
        </div>

        {/* Sub-tagline */}
        <div style={{
          fontFamily: "Arial, sans-serif",
          fontSize: 20,
          color: "rgba(169,133,79,0.8)",
          marginTop: 10,
          display: "flex",
        }}>
          Powered by Coach RBC.
        </div>

        {/* Bottom bar */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 4,
          background: "linear-gradient(90deg, #10B981 0%, #3B82F6 33%, #8B5CF6 66%, #EC4899 100%)",
          display: "flex",
        }} />
      </div>
    ),
    { ...size }
  );
}
