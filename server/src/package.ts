export {};

type ByteBufferLike = {
    offset: number;
    limit: number;
    writeInt8: (value: number) => void;
    writeUint8: (value: number) => void;
    writeInt16: (value: number) => void;
    writeUint16: (value: number) => void;
    writeInt32: (value: number) => void;
    writeUint32: (value: number) => void;
    writeFloat: (value: number) => void;
    writeDouble: (value: number) => void;
    writeString: (value: string) => void;
    readInt8: () => number;
    readUint8: () => number;
    readInt16: () => number;
    readUint16: () => number;
    readInt32: () => number;
    readUint32: () => number;
    readFloat: () => number;
    readDouble: () => number;
    readString: (length: number, metrics: number) => string;
    flip: () => void;
    toBuffer: () => Buffer;
};

type ByteBufferConstructor = {
    new (capacity: number, littleEndian: boolean): ByteBufferLike;
    DEFAULT_CAPACITY: number;
    METRICS_CHARS: number;
    calculateUTF8Chars: (value: string) => number;
    wrap: (value: Buffer, encoding: "utf8", littleEndian: boolean) => ByteBufferLike;
};

const ByteBuffer = require("bytebuffer") as ByteBufferConstructor;
const {
    CLIENT_PACKET_ID,
    SERVER_PACKET_ID,
} = require("@openao/protocol") as typeof import("@openao/protocol");

const clientPacketID = CLIENT_PACKET_ID;
const serverPacketID = SERVER_PACKET_ID;

type PacketChunk = Buffer | ArrayBuffer | ArrayBufferView | string;

export type ClientPacketID = typeof clientPacketID;
export type ServerPacketID = typeof serverPacketID;
export type PacketPayload = PacketChunk | ReadonlyArray<PacketChunk>;

export type PackageApi = {
    clientPacketID: ClientPacketID;
    serverPacketID: ServerPacketID;
    bufferRcv: ByteBufferLike;
    bufferSnd: ByteBufferLike;
    setData: (data: PacketPayload) => void;
    getPackageID: () => number;
    setPackageID: (packageID: number) => void;
    writeByte: (numByte?: number | string | boolean | null, signed?: boolean) => void;
    writeShort: (numShort?: number | string | boolean | null, signed?: boolean) => void;
    writeInt: (numInt?: number | string | boolean | null, signed?: boolean) => void;
    writeFloat: (numFloat?: number | string | boolean | null) => void;
    writeDouble: (numDouble?: number | string | boolean | null) => void;
    writeString: (dataString?: string | null) => void;
    getByte: (signed?: boolean) => number;
    getShort: (signed?: boolean) => number;
    getInt: (signed?: boolean) => number;
    getFloat: () => number;
    getDouble: () => number;
    getString: () => string;
    canReadBytes: (length: number) => boolean;
    dataSend: () => Buffer;
    encodeBatchFrame: (buffers: readonly Buffer[]) => Buffer;
};

function createByteBuffer() {
    return new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, true);
}

function normalizeNumericInput(value: number | string | boolean | null | undefined) {
    if (value === true) {
        return 1;
    }

    if (value === false || value == null || value === "") {
        return 0;
    }

    return Number.parseInt(String(value), 10) || 0;
}

function toBuffer(chunk: PacketChunk) {
    if (Buffer.isBuffer(chunk)) {
        return chunk;
    }

    if (chunk instanceof ArrayBuffer) {
        return Buffer.from(chunk);
    }

    if (ArrayBuffer.isView(chunk)) {
        return Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    }

    return Buffer.from(chunk, "utf8");
}

const pkg: PackageApi = {
    clientPacketID,
    serverPacketID,
    bufferRcv: createByteBuffer(),
    bufferSnd: createByteBuffer(),

    setData(data) {
        if (Array.isArray(data)) {
            this.bufferRcv = ByteBuffer.wrap(Buffer.concat(data.map((chunk) => toBuffer(chunk))), "utf8", true);
            return;
        }

        this.bufferRcv = ByteBuffer.wrap(toBuffer(data as PacketChunk), "utf8", true);
    },

    getPackageID() {
        return this.getByte();
    },

    setPackageID(packageID) {
        this.bufferSnd = createByteBuffer();
        this.writeByte(packageID);
    },

    writeByte(numByte, signed) {
        const value = normalizeNumericInput(numByte);

        if (signed) {
            this.bufferSnd.writeInt8(value);
            return;
        }

        this.bufferSnd.writeUint8(value);
    },

    writeShort(numShort, signed) {
        const value = normalizeNumericInput(numShort);

        if (signed) {
            this.bufferSnd.writeInt16(value);
            return;
        }

        this.bufferSnd.writeUint16(value);
    },

    writeInt(numInt, signed) {
        const value = normalizeNumericInput(numInt);

        if (signed) {
            this.bufferSnd.writeInt32(value);
            return;
        }

        this.bufferSnd.writeUint32(value);
    },

    writeFloat(numFloat) {
        this.bufferSnd.writeFloat(normalizeNumericInput(numFloat));
    },

    writeDouble(numDouble) {
        this.bufferSnd.writeDouble(normalizeNumericInput(numDouble));
    },

    writeString(dataString) {
        const value = dataString ?? "";

        this.writeShort(ByteBuffer.calculateUTF8Chars(value));
        this.bufferSnd.writeString(value);
    },

    getByte(signed) {
        return signed ? this.bufferRcv.readInt8() : this.bufferRcv.readUint8();
    },

    getShort(signed) {
        return signed ? this.bufferRcv.readInt16() : this.bufferRcv.readUint16();
    },

    getInt(signed) {
        return signed ? this.bufferRcv.readInt32() : this.bufferRcv.readUint32();
    },

    getFloat() {
        return this.bufferRcv.readFloat();
    },

    getDouble() {
        return this.bufferRcv.readDouble();
    },

    getString() {
        if (!this.canReadBytes(2)) {
            return "";
        }

        const lengthStr = this.getShort();

        if (lengthStr < 0 || !this.canReadBytes(lengthStr)) {
            return "";
        }

        return this.bufferRcv.readString(lengthStr, ByteBuffer.METRICS_CHARS);
    },

    canReadBytes(length) {
        if (length < 0) {
            return false;
        }

        return this.bufferRcv.offset + length <= this.bufferRcv.limit;
    },

    dataSend() {
        this.bufferSnd.flip();
        return this.bufferSnd.toBuffer();
    },

    encodeBatchFrame(buffers) {
        if (buffers.length === 0) {
            return Buffer.alloc(0);
        }

        if (buffers.length === 1) {
            return Buffer.from(buffers[0]);
        }

        const chunks: Buffer[] = [];
        const header = Buffer.allocUnsafe(3);
        header.writeUInt8(this.clientPacketID.batch, 0);
        header.writeUInt16LE(buffers.length, 1);
        chunks.push(header);

        for (const frame of buffers) {
            const length = frame.byteLength;

            if (length > 0xffff) {
                throw new RangeError(`Batch frame packet too large: ${length}`);
            }

            const packetHeader = Buffer.allocUnsafe(2);
            packetHeader.writeUInt16LE(length, 0);
            chunks.push(packetHeader, frame);
        }

        return Buffer.concat(chunks);
    },
};

module.exports = pkg;
