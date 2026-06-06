/**
 * One-shot raster icon generator. Run via:
 *   node scripts/generate-pwa-icons.mjs
 *
 * Produces:
 *   public/icons/icon-192.png
 *   public/icons/icon-512.png
 *   public/icons/icon-maskable-512.png
 *
 * No external dependencies - uses the built-in zlib + a hand-rolled PNG
 * encoder so this runs on a fresh checkout with zero install steps.
 *
 * The icons are simple gradient squares with "UP" text rendered as a small
 * bitmap. This is intentionally lightweight; replace with designer assets
 * by overwriting the PNGs in public/icons/ at any time.
 */
import {mkdirSync, writeFileSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {deflateSync} from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "..", "public", "icons");
mkdirSync(OUT_DIR, {recursive: true});

// ⎯ PNG encoder (no deps) ⎯
function crc32(buf) {
    let c;
    const table = (crc32._t ||= (() => {
        const t = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            c = n;
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
            t[n] = c >>> 0;
        }
        return t;
    })());
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crcBuf = Buffer.alloc(4);
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // RGBA
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;
    const stride = width * 4;
    const raw = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y++) {
        raw[y * (stride + 1)] = 0; // filter: None
        rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
    }
    const idat = deflateSync(raw);
    return Buffer.concat([
        sig,
        chunk("IHDR", ihdr),
        chunk("IDAT", idat),
        chunk("IEND", Buffer.alloc(0)),
    ]);
}

// ⎯ Tiny bitmap font for "UP" (5x7 per glyph) ⎯
const GLYPHS = {
    U: [
        "X...X",
        "X...X",
        "X...X",
        "X...X",
        "X...X",
        "X...X",
        ".XXX.",
    ],
    P: [
        "XXXX.",
        "X...X",
        "X...X",
        "XXXX.",
        "X....",
        "X....",
        "X....",
    ],
};

function fillGradient(size, maskable) {
    const buf = Buffer.alloc(size * size * 4);
    const cx = size / 2;
    const cy = size / 2;
    const radius = maskable ? size * 0.62 : size * 0.9;
    const cornerR = maskable ? 0 : Math.round(size * 0.18);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            // Rounded-corner clip for non-maskable.
            let inside = true;
            if (cornerR > 0) {
                const dx = Math.abs(x - cx) - (size / 2 - cornerR);
                const dy = Math.abs(y - cy) - (size / 2 - cornerR);
                if (dx > 0 && dy > 0 && dx * dx + dy * dy > cornerR * cornerR) {
                    inside = false;
                }
            }
            // Maskable: circular safe-zone fill (square is fine, but ensure full bleed).
            if (maskable) {
                const dist = Math.hypot(x - cx, y - cy);
                if (dist > radius) {
                    // Still paint the bleed area in solid indigo so the platform can mask.
                }
            }
            // Diagonal gradient maroon shades
            const t = (x + y) / (size * 2);
            const r = Math.round(127 + (153 - 127) * t);
            const g = Math.round(29 + (27 - 29) * t);
            const b = Math.round(29 + (27 - 29) * t);
            if (inside) {
                buf[i] = r;
                buf[i + 1] = g;
                buf[i + 2] = b;
                buf[i + 3] = 255;
            } else {
                buf[i] = 0;
                buf[i + 1] = 0;
                buf[i + 2] = 0;
                buf[i + 3] = 0;
            }
        }
    }
    return buf;
}

function drawText(buf, size, text, color) {
    const glyphW = 5;
    const glyphH = 7;
    const spacing = 1;
    const charsW = text.length * glyphW + (text.length - 1) * spacing;
    const scale = Math.floor((size * 0.55) / charsW);
    const totalW = charsW * scale;
    const totalH = glyphH * scale;
    const startX = Math.floor((size - totalW) / 2);
    const startY = Math.floor((size - totalH) / 2);

    for (let ci = 0; ci < text.length; ci++) {
        const glyph = GLYPHS[text[ci]];
        if (!glyph) continue;
        const offsetX = startX + ci * (glyphW + spacing) * scale;
        for (let gy = 0; gy < glyphH; gy++) {
            const row = glyph[gy];
            for (let gx = 0; gx < glyphW; gx++) {
                if (row[gx] !== "X") continue;
                for (let py = 0; py < scale; py++) {
                    for (let px = 0; px < scale; px++) {
                        const x = offsetX + gx * scale + px;
                        const y = startY + gy * scale + py;
                        const i = (y * size + x) * 4;
                        buf[i] = color[0];
                        buf[i + 1] = color[1];
                        buf[i + 2] = color[2];
                        buf[i + 3] = 255;
                    }
                }
            }
        }
    }
}

function generate(size, name, {maskable = false} = {}) {
    const buf = fillGradient(size, maskable);
    drawText(buf, size, "UP", [255, 255, 255]);
    const png = encodePng(size, size, buf);
    const path = resolve(OUT_DIR, name);
    writeFileSync(path, png);
    console.log(`✓ ${path} (${png.length.toLocaleString()} bytes)`);
}

generate(192, "icon-192.png");
generate(512, "icon-512.png");
generate(512, "icon-maskable-512.png", {maskable: true});
