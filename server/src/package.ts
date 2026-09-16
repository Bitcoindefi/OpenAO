import {
    CLIENT_PACKET_ID,
    SERVER_PACKET_ID,
    PacketReader,
    PacketWriter,
    decodeClientPacket,
    type DecodedClientPacket,
} from "@openao/protocol";

type PacketChunk = Buffer | ArrayBuffer | ArrayBufferView | string;

export type ClientPacketID = typeof CLIENT_PACKET_ID;
export type ServerPacketID = typeof SERVER_PACKET_ID;
export type PacketPayload = PacketChunk | ReadonlyArray<PacketChunk>;

export type PackageApi = {
    clientPacketID: ClientPacketID;
    serverPacketID: ServerPacketID;
    decodeClientPacket: (data: PacketPayload) => DecodedClientPacket;
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

function toBuffer(chunk: PacketChunk): Buffer {
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

let reader = new PacketReader(new ArrayBuffer(0));
let writer = new PacketWriter();

const pkg: PackageApi = {
    clientPacketID: CLIENT_PACKET_ID,
    serverPacketID: SERVER_PACKET_ID,

    decodeClientPacket(data) {
        const buffer = Array.isArray(data)
            ? Buffer.concat(data.map((chunk) => toBuffer(chunk)))
            : toBuffer(data as PacketChunk);
        return decodeClientPacket(buffer);
    },

    setData(data) {
        const buffer = Array.isArray(data)
            ? Buffer.concat(data.map((chunk) => toBuffer(chunk)))
            : toBuffer(data as PacketChunk);
        reader = new PacketReader(buffer);
    },

    getPackageID() {
        return reader.getByte();
    },

    setPackageID(packageID) {
        writer = new PacketWriter(packageID);
    },

    writeByte(numByte, signed) {
        writer.writeByte(numByte, signed);
    },

    writeShort(numShort, signed) {
        writer.writeShort(numShort, signed);
    },

    writeInt(numInt, signed) {
        writer.writeInt(numInt, signed);
    },

    writeFloat(numFloat) {
        writer.writeFloat(numFloat);
    },

    writeDouble(numDouble) {
        writer.writeDouble(numDouble);
    },

    writeString(dataString) {
        writer.writeString(dataString);
    },

    getByte(signed) {
        return reader.getByte(signed);
    },

    getShort(signed) {
        return reader.getShort(signed);
    },

    getInt(signed) {
        return reader.getInt(signed);
    },

    getFloat() {
        return reader.getFloat();
    },

    getDouble() {
        return reader.getDouble();
    },

    getString() {
        if (!reader.canReadBytes(2)) {
            return "";
        }

        try {
            return reader.getString();
        } catch {
            return "";
        }
    },

    canReadBytes(length) {
        return reader.canReadBytes(length);
    },

    dataSend() {
        return Buffer.from(writer.toUint8Array());
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
