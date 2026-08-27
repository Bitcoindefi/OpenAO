import { describe, it, expect, vi } from "vitest";
import {
  buildPasswordResetHtml,
  buildPasswordResetText,
  isSesConfigured,
  getSesClient
} from "../lib/email";

describe("Password Reset Email & SES Configuration (Issue #1)", () => {
  it("Generates valid HTML and text bodies with 30-minute expiry warning", () => {
    const input = {
      to: "jugador@ejemplo.com",
      displayName: "GuerreroTest",
      resetUrl: "https://openao.cosmosapp.lat/auth/reset?token=test-token-123"
    };

    const html = buildPasswordResetHtml(input);
    expect(html).toContain("Hola GuerreroTest");
    expect(html).toContain("30 minutos");
    expect(html).toContain("test-token-123");

    const text = buildPasswordResetText(input);
    expect(text).toContain("GuerreroTest");
    expect(text).toContain("30 minutos");
  });

  it("Detects missing SES credentials safely without crashing process unhandled", () => {
    // With dummy or empty config, isSesConfigured returns false
    const configured = isSesConfigured();
    if (!configured) {
      expect(() => getSesClient()).toThrow(/Amazon SES no está configurado/);
    }
  });
});
