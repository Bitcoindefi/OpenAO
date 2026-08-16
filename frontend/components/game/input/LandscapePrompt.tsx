"use client";

import React from "react";

/**
 * Landscape rotation prompt for mobile devices.
 * Shows when the device is in portrait orientation.
 */
export default function LandscapePrompt() {
  return (
    <div className="mobile-landscape-overlay" style={{
      display: "none",
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      background: "#020617",
      color: "#ededed",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 24,
      fontFamily: "sans-serif",
      textAlign: "center",
      padding: 32,
    }}>
      <div style={{ fontSize: 64, marginBottom: 8 }}>📱</div>
      <h2 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>
        Rotar dispositivo
      </h2>
      <p style={{ fontSize: 14, color: "#94a3b8", maxWidth: 280, margin: 0 }}>
        Para jugar, girá tu teléfono a posición horizontal.
      </p>
      <div style={{
        width: 80,
        height: 120,
        border: "3px solid #a854f7",
        borderRadius: 12,
        marginTop: 16,
        position: "relative",
        animation: "rotate-phone 2s ease-in-out infinite",
      }}>
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 4,
          height: 40,
          background: "#a854f7",
          borderRadius: 2,
          transform: "translate(-50%, -50%)",
        }} />
      </div>
      <style>{`
        @keyframes rotate-phone {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(90deg); }
        }
      `}</style>
    </div>
  );
}
