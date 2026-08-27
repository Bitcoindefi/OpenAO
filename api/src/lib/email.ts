import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import config from "../config";

export type PasswordResetEmailInput = {
  to: string;
  displayName: string;
  resetUrl: string;
};

let sesClient: SESv2Client | null = null;

export function isSesConfigured(): boolean {
  return Boolean(
    config.sesRegion &&
    config.sesAccessKeyId &&
    config.sesSecretAccessKey &&
    config.sesFromEmail
  );
}

export function getSesClient(): SESv2Client {
  if (!isSesConfigured()) {
    console.error("[EmailService] Error de configuración: Amazon SES no está configurado. Faltan variables de entorno (SES_REGION, SES_ACCESS_KEY_ID, SES_SECRET_ACCESS_KEY, SES_FROM_EMAIL).");
    throw new Error("Amazon SES no está configurado");
  }

  if (!sesClient) {
    sesClient = new SESv2Client({
      region: config.sesRegion,
      credentials: {
        accessKeyId: config.sesAccessKeyId!,
        secretAccessKey: config.sesSecretAccessKey!,
      },
    });
  }

  return sesClient;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildPasswordResetHtml({ displayName, resetUrl }: PasswordResetEmailInput): string {
  const safeName = escapeHtml(displayName);
  const safeUrl = escapeHtml(resetUrl);

  return `
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Recuperar contraseña</title>
  </head>
  <body style="margin:0;padding:0;background:#09090b;font-family:Arial,sans-serif;color:#e7e5e4;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:radial-gradient(circle at top,#1f293755,transparent 35%),linear-gradient(180deg,#0c0a09,#111827);padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:28px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.45);">
            <tr>
              <td style="padding:28px 28px 20px;background:radial-gradient(circle at top,#f59e0b33,transparent 55%),linear-gradient(135deg,#1c1917,#0f172a);">
                <div style="font-size:11px;letter-spacing:0.34em;text-transform:uppercase;color:#fde68a;opacity:0.85;">OpenAO</div>
                <h1 style="margin:14px 0 8px;font-size:30px;line-height:1.2;color:#fafaf9;">Recupera tu acceso</h1>
                <p style="margin:0;font-size:15px;line-height:1.7;color:#d6d3d1;">Hola ${safeName}, recibimos un pedido para cambiar la contraseña de tu cuenta.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#d6d3d1;">El enlace vence en 30 minutos y solo sirve una vez.</p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
                  <tr>
                    <td align="center" bgcolor="#fde68a" style="border-radius:16px;">
                      <a href="${safeUrl}" style="display:inline-block;padding:14px 22px;font-size:15px;font-weight:700;color:#111827;text-decoration:none;">Cambiar contraseña</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 10px;font-size:13px;line-height:1.7;color:#a8a29e;">Si el botón no funciona, copia y pega este link en tu navegador:</p>
                <p style="margin:0 0 20px;word-break:break-word;font-size:13px;line-height:1.7;color:#67e8f9;">${safeUrl}</p>
                <div style="border-radius:18px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);padding:16px;">
                  <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#fef3c7;">Seguridad</p>
                  <p style="margin:0;font-size:13px;line-height:1.7;color:#d6d3d1;">Si no fuiste vos, ignora este mensaje. Tu contraseña actual seguirá funcionando hasta que completes el cambio.</p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();
}

export function buildPasswordResetText({ displayName, resetUrl }: PasswordResetEmailInput): string {
  return [
    `Hola ${displayName},`,
    "",
    "Recibimos un pedido para cambiar la password de tu cuenta de OpenAO.",
    "",
    "Abre este link para elegir una nueva password:",
    resetUrl,
    "",
    "El enlace vence en 30 minutos y solo se puede usar una vez.",
    "Si no fuiste vos, ignora este email.",
  ].join("\n");
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
  try {
    const client = getSesClient();

    await client.send(new SendEmailCommand({
      FromEmailAddress: `${config.sesFromName} <${config.sesFromEmail}>`,
      Destination: {
        ToAddresses: [input.to],
      },
      Content: {
        Simple: {
          Subject: {
            Data: "OpenAO | Recuperación de contraseña",
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: buildPasswordResetHtml(input),
              Charset: "UTF-8",
            },
            Text: {
              Data: buildPasswordResetText(input),
              Charset: "UTF-8",
            },
          },
        },
      },
    }));
  } catch (err: any) {
    if (err.message === "Amazon SES no está configurado") {
      throw err;
    }
    console.error(`[EmailService] Error AWS SES al enviar a ${input.to}: [${err.name || "Error"}] ${err.message}`);
    throw new Error("Error en el proveedor de correo");
  }
}
