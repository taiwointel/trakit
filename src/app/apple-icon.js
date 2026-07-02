import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 36,
          background: "#15191F",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gold top bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 12,
            background: "linear-gradient(90deg, #C8862E, #A9854F)",
            borderRadius: "36px 36px 0 0",
          }}
        />
        {/* T7 text */}
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 72,
            fontWeight: 700,
            color: "#ECE9E1",
            letterSpacing: -2,
            marginTop: 8,
            display: "flex",
          }}
        >
          <span style={{ color: "#ECE9E1" }}>T</span>
          <span style={{ color: "#A9854F" }}>7</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
