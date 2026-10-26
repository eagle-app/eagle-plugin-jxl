const fs = require('fs');

// Reads just enough of a JPEG XL file to tell whether it is an animation
// (ImageMetadata.have_animation), without decoding any pixels.
// Handles bare codestreams and the ISOBMFF container (jxlc / jxlp boxes).

const CONTAINER_SIGNATURE = [0x00, 0x00, 0x00, 0x0c, 0x4a, 0x58, 0x4c, 0x20, 0x0d, 0x0a, 0x87, 0x0a];
// SizeHeader + ImageMetadata up to have_animation fit in a few dozen bytes.
const HEADER_BYTES = 256;

function readAt(fd, position, length) {
    const buffer = Buffer.alloc(length);
    const bytesRead = fs.readSync(fd, buffer, 0, length, position);
    return buffer.subarray(0, bytesRead);
}

// Returns the first bytes of the codestream, or null if this isn't a JXL file.
function readCodestreamStart(fd, fileSize) {
    const signature = readAt(fd, 0, CONTAINER_SIGNATURE.length);
    if (signature[0] === 0xff && signature[1] === 0x0a) {
        return readAt(fd, 0, HEADER_BYTES);
    }
    if (!CONTAINER_SIGNATURE.every((byte, i) => signature[i] === byte)) {
        return null;
    }

    const chunks = [];
    let collected = 0;
    let position = 0;
    while (position + 8 <= fileSize && collected < HEADER_BYTES) {
        const header = readAt(fd, position, 16);
        let boxSize = header.readUInt32BE(0);
        const type = header.toString('latin1', 4, 8);
        let headerSize = 8;
        if (boxSize === 1) {
            if (header.length < 16) break;
            boxSize = Number(header.readBigUInt64BE(8));
            headerSize = 16;
        } else if (boxSize === 0) {
            boxSize = fileSize - position;
        }
        if (boxSize < headerSize) break;

        if (type === 'jxlc' || type === 'jxlp') {
            // jxlp payloads start with a 4-byte sequence number.
            const skip = type === 'jxlp' ? 4 : 0;
            const length = Math.min(boxSize - headerSize - skip, HEADER_BYTES - collected);
            if (length > 0) {
                const chunk = readAt(fd, position + headerSize + skip, length);
                chunks.push(chunk);
                collected += chunk.length;
            }
            if (type === 'jxlc') break;
        }
        position += boxSize;
    }
    return chunks.length ? Buffer.concat(chunks) : null;
}

// JXL packs fields least-significant bit first.
function bitReader(bytes) {
    let bitPosition = 0;
    return (count) => {
        let value = 0;
        for (let i = 0; i < count; i++, bitPosition++) {
            const byte = bytes[bitPosition >> 3];
            if (byte === undefined) throw new Error('JXL header is truncated');
            value += ((byte >> (bitPosition & 7)) & 1) * 2 ** i;
        }
        return value;
    };
}

// U32 field: 2-bit selector, then the selected [offset, extraBits] distribution.
function readU32(read, distributions) {
    const [offset, bits] = distributions[read(2)];
    return offset + (bits ? read(bits) : 0);
}

const SIZE_DIST = [[1, 9], [1, 13], [1, 18], [1, 30]];
const PREVIEW_DIV8_DIST = [[16, 0], [32, 0], [1, 5], [33, 9]];
const PREVIEW_DIST = [[1, 6], [65, 8], [321, 10], [1345, 12]];

function skipSizeHeader(read) {
    const small = read(1);
    if (small) read(5); else readU32(read, SIZE_DIST);
    const ratio = read(3);
    if (ratio === 0) {
        if (small) read(5); else readU32(read, SIZE_DIST);
    }
}

function skipPreviewHeader(read) {
    const distributions = read(1) ? PREVIEW_DIV8_DIST : PREVIEW_DIST;
    readU32(read, distributions);
    if (read(3) === 0) readU32(read, distributions);
}

function codestreamHasAnimation(codestream) {
    if (codestream.length < 2 || codestream[0] !== 0xff || codestream[1] !== 0x0a) return false;
    const read = bitReader(codestream.subarray(2));
    skipSizeHeader(read);
    if (read(1)) return false;              // ImageMetadata.all_default
    if (!read(1)) return false;             // extra_fields
    read(3);                                // orientation
    if (read(1)) skipSizeHeader(read);      // have_intrinsic_size
    if (read(1)) skipPreviewHeader(read);   // have_preview
    return read(1) === 1;                   // have_animation
}

function isAnimated(filePath) {
    let fd;
    try {
        fd = fs.openSync(filePath, 'r');
        const codestream = readCodestreamStart(fd, fs.fstatSync(fd).size);
        return codestream ? codestreamHasAnimation(codestream) : false;
    } catch (err) {
        console.warn('Could not read JXL header:', err.message);
        return false;
    } finally {
        if (fd !== undefined) fs.closeSync(fd);
    }
}

module.exports = { isAnimated, codestreamHasAnimation };
