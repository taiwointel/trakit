import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
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
            height: 2.5,
            background: "#A9854F",
          }}
        />
        {/* T7 text */}
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 13,
            fontWeight: 700,
            color: "#ECE9E1",
            letterSpacing: -0.5,
            marginTop: 2,
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
