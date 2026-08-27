import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import config from "../config";

export class SesNotConfiguredError extends Error {
  constructor(message = "Amazon SES no está configurado") {
    super(message);
    this.name = "SesNotConfiguredError";
  }
}

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
    throw new SesNotConfiguredError("Amazon SES no está configurado");
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
      <meta charset="UTF-8">
      <title>Recuperación de contraseña - OpenAO</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
        .container { max-width: 560px; margin: 0 auto; background-color: #1e293b; border-radius: 8px; padding: 32px; border: 1px solid #334155; }
        .btn { display: inline-block; background-color: #3b82f6; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 20px; }
        .footer { margin-top: 32px; font-size: 12px; color: #94a3b8; border-top: 1px solid #334155; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Hola, ${safeName}</h2>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta de OpenAO.</p>
        <p>Haz clic en el siguiente botón para continuar:</p>
        <p style="text-align: center;">
          <a href="${safeUrl}" class="btn" target="_blank" rel="noopener noreferrer">Restablecer Contraseña</a>
        </p>
        <p style="font-size: 14px; color: #cbd5e1;">Este enlace expirará en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
        <div class="footer">
          <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all;"><a href="${safeUrl}" style="color: #60a5fa;">${safeUrl}</a></p>
        </div>
      </div>
    </body>
    </html>
  `.trim();
}

export function buildPasswordResetText({ displayName, resetUrl }: PasswordResetEmailInput): string {
  return `
Hola, ${displayName}.

Recibimos una solicitud para restablecer la contraseña de tu cuenta de OpenAO.
Para continuar, visita el siguiente enlace en tu navegador:

${resetUrl}

Este enlace expirará en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
  `.trim();
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
  const client = getSesClient();

  try {
    await client.send(new SendEmailCommand({
      FromEmailAddress: config.sesFromEmail!,
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
    if (err instanceof SesNotConfiguredError) {
      throw err;
    }
    console.error(`[EmailService] Error AWS SES al enviar a ${input.to}: [${err.name || "Error"}] ${err.message}`);
    throw new Error("Error en el proveedor de correo");
  }
}