export type SesConfigLike = {
  sesRegion: string | null;
  sesAccessKeyId: string | null;
  sesSecretAccessKey: string | null;
  sesFromEmail: string | null;
};

export const SES_REQUIRED_ENV_NAMES = [
  "SES_REGION",
  "SES_ACCESS_KEY_ID",
  "SES_SECRET_ACCESS_KEY",
  "SES_FROM_EMAIL",
] as const;

export const PASSWORD_RESET_EMAIL_CLIENT_ERROR =
  "No se pudo enviar el email de recuperacion. Intenta de nuevo.";

export function getMissingSesEnvNames(cfg: SesConfigLike): string[] {
  const missing: string[] = [];

  if (!cfg.sesRegion) {
    missing.push("SES_REGION");
  }
  if (!cfg.sesAccessKeyId) {
    missing.push("SES_ACCESS_KEY_ID");
  }
  if (!cfg.sesSecretAccessKey) {
    missing.push("SES_SECRET_ACCESS_KEY");
  }
  if (!cfg.sesFromEmail) {
    missing.push("SES_FROM_EMAIL");
  }

  return missing;
}

export function assertSesConfigured(cfg: SesConfigLike): void {
  const missing = getMissingSesEnvNames(cfg);

  if (missing.length === 0) {
    return;
  }

  throw new Error(
    `Amazon SES no esta configurado. Faltan variables: ${missing.join(", ")}. Ver api/.env.example y la seccion de correo del README.`,
  );
}

export function formatSesSendError(error: unknown): string {
  if (!(error instanceof Error)) {
    return `error_desconocido=${String(error)}`;
  }

  const anyError = error as Error & {
    name?: string;
    code?: string;
    Code?: string;
    $metadata?: { httpStatusCode?: number; requestId?: string };
    Error?: { Code?: string; Message?: string };
  };

  const awsCode =
    anyError.code ||
    anyError.Code ||
    anyError.Error?.Code ||
    anyError.name ||
    "Error";
  const status = anyError.$metadata?.httpStatusCode;
  const requestId = anyError.$metadata?.requestId;
  const lower = `${awsCode} ${error.message}`.toLowerCase();

  let hint = "revisar_credenciales_o_permisos";
  if (
    lower.includes("not authorized") ||
    lower.includes("message rejected") ||
    lower.includes("email address is not verified") ||
    lower.includes("sandbox")
  ) {
    hint =
      "posible_sandbox_o_identidad_sin_verificar — verificar dominio/email en SES y salir de sandbox si hace falta";
  } else if (
    error.message.includes("Amazon SES no esta configurado") ||
    lower.includes("no esta configurado")
  ) {
    hint = "sin_configurar";
  }

  const parts = [
    `name=${awsCode}`,
    `message=${error.message}`,
    `hint=${hint}`,
  ];
  if (status !== undefined) {
    parts.push(`httpStatus=${status}`);
  }
  if (requestId) {
    parts.push(`requestId=${requestId}`);
  }

  return parts.join(" | ");
}
