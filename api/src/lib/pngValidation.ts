/**
 * Validacion de PNG subidos por administradores.
 *
 * No se confia en la extension del archivo ni en el Content-Type que manda el
 * cliente: ambos los controla quien sube. Lo unico confiable es el contenido.
 */

/** Firma de 8 bytes con la que arranca todo PNG valido (RFC 2083). */
const PNG_SIGNATURE = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/** El tile del juego es de 32x32. Se aceptan multiplos para tiles compuestos. */
export const TILE_SIZE = 32;

export const MAX_PNG_BYTES = 2 * 1024 * 1024;
export const MAX_PNG_DIMENSION = 1024;

export type PngValidationOk = {
    ok: true;
    width: number;
    height: number;
    byteSize: number;
};

export type PngValidationError = {
    ok: false;
    reason: string;
};

export type PngValidationResult = PngValidationOk | PngValidationError;

/**
 * Lee el ancho y alto desde el chunk IHDR, que por especificacion es siempre
 * el primero y arranca en el byte 8.
 *
 *   0..7    firma
 *   8..11   longitud del chunk
 *   12..15  tipo de chunk ("IHDR")
 *   16..19  ancho  (uint32 big endian)
 *   20..23  alto   (uint32 big endian)
 */
function readIhdrDimensions(
    buffer: Buffer,
): { width: number; height: number } | null {
    if (buffer.length < 24) {
        return null;
    }

    if (buffer.subarray(12, 16).toString("ascii") !== "IHDR") {
        return null;
    }

    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
    };
}

export function validatePngUpload(buffer: Buffer): PngValidationResult {
    if (buffer.length === 0) {
        return { ok: false, reason: "El archivo esta vacio." };
    }

    if (buffer.length > MAX_PNG_BYTES) {
        return {
            ok: false,
            reason: `El archivo supera el maximo de ${Math.floor(MAX_PNG_BYTES / 1024)} KB.`,
        };
    }

    // Magic bytes: esto es lo que descarta un .exe renombrado a .png.
    if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
        return { ok: false, reason: "El archivo no es un PNG valido." };
    }

    const dimensions = readIhdrDimensions(buffer);

    if (!dimensions) {
        return { ok: false, reason: "No se pudo leer la cabecera del PNG." };
    }

    const { width, height } = dimensions;

    if (width === 0 || height === 0) {
        return { ok: false, reason: "El PNG tiene dimensiones invalidas." };
    }

    if (width > MAX_PNG_DIMENSION || height > MAX_PNG_DIMENSION) {
        return {
            ok: false,
            reason: `Las dimensiones superan el maximo de ${MAX_PNG_DIMENSION}px por lado.`,
        };
    }

    if (width % TILE_SIZE !== 0 || height % TILE_SIZE !== 0) {
        return {
            ok: false,
            reason: `El PNG debe medir multiplos de ${TILE_SIZE}px por lado. Recibido: ${width}x${height}.`,
        };
    }

    return { ok: true, width, height, byteSize: buffer.length };
}
