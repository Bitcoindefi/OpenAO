export type BinaryInput = ArrayBuffer | ArrayBufferView;

export function toUint8Array(input: BinaryInput): Uint8Array {
    if (input instanceof ArrayBuffer) {
        return new Uint8Array(input);
    }

    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
}

function normalizeInteger(value: number | string | boolean | null | undefined): number {
    if (value === true) {
        return 1;
    }

    if (value === false || value == null || value === "") {
        return 0;
    }

    return Number.parseInt(String(value), 10) || 0;
}

export class PacketWriter {
    private readonly bytes: number[] = [];
    private readonly encoder = new TextEncoder();

    constructor(packetId?: number) {
        if (packetId !== undefined) {
            this.writeByte(packetId);
        }
    }

    writeByte(value: number | string | boolean | null | undefined, signed = false): void {
        const normalized = normalizeInteger(value);
        const buffer = new ArrayBuffer(1);
        const view = new DataView(buffer);

        if (signed) {
            view.setInt8(0, normalized);
        } else {
            view.setUint8(0, normalized);
        }

        this.bytes.push(view.getUint8(0));
    }

    writeShort(value: number | string | boolean | null | undefined, signed = false): void {
        this.writeInteger(value, 2, signed);
    }

    writeInt(value: number | string | boolean | null | undefined, signed = false): void {
        this.writeInteger(value, 4, signed);
    }

    writeFloat(value: number | string | boolean | null | undefined): void {
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        view.setFloat32(0, Number(value) || 0, true);
        this.pushBuffer(buffer);
    }

    writeDouble(value: number | string | boolean | null | undefined): void {
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setFloat64(0, Number(value) || 0, true);
        this.pushBuffer(buffer);
    }

    writeString(value: string | null | undefined): void {
        const normalized = value ?? "";
        const encoded = this.encoder.encode(normalized);
        this.writeShort(Array.from(normalized).length);
        this.bytes.push(...encoded);
    }

    toUint8Array(): Uint8Array {
        return Uint8Array.from(this.bytes);
    }

    toArrayBuffer(): ArrayBuffer {
        return this.toUint8Array().buffer as ArrayBuffer;
    }

    private writeInteger(
        value: number | string | boolean | null | undefined,
        byteLength: 2 | 4,
        signed: boolean,
    ): void {
        const normalized = normalizeInteger(value);
        const buffer = new ArrayBuffer(byteLength);
        const view = new DataView(buffer);

        if (byteLength === 2) {
            signed ? view.setInt16(0, normalized, true) : view.setUint16(0, normalized, true);
        } else {
            signed ? view.setInt32(0, normalized, true) : view.setUint32(0, normalized, true);
        }

        this.pushBuffer(buffer);
    }

    private pushBuffer(buffer: ArrayBuffer): void {
        this.bytes.push(...new Uint8Array(buffer));
    }
}

export class PacketReader {
    private readonly view: DataView;
    private readonly decoder = new TextDecoder();
    private offset = 0;

    constructor(
        input: BinaryInput,
        private readonly transformString: (value: string) => string = (value) => value,
    ) {
        const bytes = toUint8Array(input);
        this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    }

    get remainingBytes(): number {
        return this.view.byteLength - this.offset;
    }

    canReadBytes(length: number): boolean {
        return length >= 0 && this.offset + length <= this.view.byteLength;
    }

    getByte(signed = false): number {
        this.assertReadable(1);
        const value = signed ? this.view.getInt8(this.offset) : this.view.getUint8(this.offset);
        this.offset += 1;
        return value;
    }

    getShort(signed = false): number {
        this.assertReadable(2);
        const value = signed ? this.view.getInt16(this.offset, true) : this.view.getUint16(this.offset, true);
        this.offset += 2;
        return value;
    }

    getInt(signed = false): number {
        this.assertReadable(4);
        const value = signed ? this.view.getInt32(this.offset, true) : this.view.getUint32(this.offset, true);
        this.offset += 4;
        return value;
    }

    getFloat(): number {
        this.assertReadable(4);
        const value = this.view.getFloat32(this.offset, true);
        this.offset += 4;
        return value;
    }

    getDouble(): number {
        this.assertReadable(8);
        const value = this.view.getFloat64(this.offset, true);
        this.offset += 8;
        return value;
    }

    getString(): string {
        const characterLength = this.getShort();
        const byteLength = this.getUtf8ByteLength(characterLength);
        this.assertReadable(byteLength);
        const bytes = new Uint8Array(
            this.view.buffer,
            this.view.byteOffset + this.offset,
            byteLength,
        );
        this.offset += byteLength;
        return this.transformString(this.decoder.decode(bytes));
    }

    getBytes(length: number): ArrayBuffer {
        this.assertReadable(length);
        const bytes = new Uint8Array(
            this.view.buffer,
            this.view.byteOffset + this.offset,
            length,
        );
        this.offset += length;
        return bytes.slice().buffer;
    }

    private getUtf8ByteLength(characterLength: number): number {
        let byteLength = 0;

        for (let charactersRead = 0; charactersRead < characterLength; charactersRead += 1) {
            this.assertReadable(byteLength + 1);
            const currentByte = this.view.getUint8(this.offset + byteLength);

            if ((currentByte & 0x80) === 0) {
                byteLength += 1;
            } else if ((currentByte & 0xe0) === 0xc0) {
                byteLength += 2;
            } else if ((currentByte & 0xf0) === 0xe0) {
                byteLength += 3;
            } else if ((currentByte & 0xf8) === 0xf0) {
                byteLength += 4;
            } else {
                throw new RangeError(`Invalid UTF-8 leading byte: ${currentByte}`);
            }
        }

        return byteLength;
    }

    private assertReadable(length: number): void {
        if (!this.canReadBytes(length)) {
            throw new RangeError(`Cannot read ${length} bytes from packet; ${this.remainingBytes} remain.`);
        }
    }
}
