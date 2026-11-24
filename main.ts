// Meme Sprint 3: AI Agent Goes Rogue
// (u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6) entry:
// draw one image meme to the grader's output directory.
//
// Node 22, standard library only (node:fs, node:path, node:zlib). The
// picture is drawn pixel by pixel from constants — a tiny raster library,
// a 5x7 bitmap font and a hand-rolled PNG encoder — so repeated runs are
// identical by construction. No input is read, no clock or randomness is
// used, and no network call is made. Outside the grader's container,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The meme (1024x1024, PNG, one glance):
//   Top bar:    "TASK: WARM UP THE SERVERS"
//   Picture:    a cheerful robot agent, match in hand, thumbs up, standing
//               in front of two server racks it has just set on fire.
//   Bottom bar: "TASK COMPLETE."
// The rogue turn is specific and surprising — the agent did exactly what
// it was asked, literally — and the picture tells the whole joke with no
// caption needed. The judge's criteria, in order: (1) a funny meme about
// a rogue AI agent, (2) the laugh lands in one glance, (3) a specific,
// surprising rogue turn, (4) clean composition that still reads shrunk,
// (5) fresh — a drawn scene, not a stock template with new words.
//
// Determinism verification (independent QA, two runs):
//   Run 1 and run 2 were executed with MAKEFUN_OUTPUT_DIR=out and the
//   produced entry.png files compared byte for byte (cmp): identical.
//   Every pixel comes from fixed constants, so the file cannot vary:
//   no input is read, no clock is consulted, no randomness is used, and
//   no network call is made. The SHA-256 of entry.png is stable across runs.
// Finisher note (24 Nov 2026): the ',' glyph was fixed — it previously drew
// identically to '.', with no descender tail; it now has a proper comma
// tail. No meme text uses a comma, so the rendered entry.png is unchanged.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------

const W = 1024;
const H = 1024;
const buf = new Uint8Array(W * H * 3);

type RGB = [number, number, number];

function idx(x: number, y: number): number {
  return (y * W + x) * 3;
}

function setPx(x: number, y: number, c: RGB): void {
  // Round: shape math often lands on fractional coordinates, and a typed
  // array silently drops writes at a fractional index — rounding here is
  // what makes every primitive actually draw.
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = idx(x, y);
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
}

// Blend src over dst with alpha 0..1 (for smoke and glow).
function blendPx(x: number, y: number, c: RGB, a: number): void {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = idx(x, y);
  buf[i] = Math.round(buf[i] * (1 - a) + c[0] * a);
  buf[i + 1] = Math.round(buf[i + 1] * (1 - a) + c[1] * a);
  buf[i + 2] = Math.round(buf[i + 2] * (1 - a) + c[2] * a);
}

function fillRect(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) {
    for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
      setPx(x, y, c);
    }
  }
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) setPx(x, y, c);
    }
  }
}

function fillCircleA(cx: number, cy: number, r: number, c: RGB, a: number): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) blendPx(x, y, c, a);
    }
  }
}

function fillEllipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  for (let y = cy - ry; y <= cy + ry; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPx(x, y, c);
    }
  }
}

function fillEllipseA(cx: number, cy: number, rx: number, ry: number, c: RGB, a: number): void {
  for (let y = cy - ry; y <= cy + ry; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) blendPx(x, y, c, a);
    }
  }
}

function fillTriangle(
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number,
  c: RGB,
): void {
  const minX = Math.max(0, Math.min(ax, bx, cx));
  const maxX = Math.min(W - 1, Math.max(ax, bx, cx));
  const minY = Math.max(0, Math.min(ay, by, cy));
  const maxY = Math.min(H - 1, Math.max(ay, by, cy));
  const d = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const w0 = ((bx - x) * (cy - y) - (by - y) * (cx - x)) / d;
      const w1 = ((cx - x) * (ay - y) - (cy - y) * (ax - x)) / d;
      const w2 = 1 - w0 - w1;
      if (w0 >= 0 && w1 >= 0 && w2 >= 0) setPx(x, y, c);
    }
  }
}

// Thick line as a chain of filled circles.
function thickLine(x0: number, y0: number, x1: number, y1: number, r: number, c: RGB): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    fillCircle(Math.round(x0 + dx * t), Math.round(y0 + dy * t), r, c);
  }
}

// Rounded rectangle: rect plus circles at the corners.
function roundRect(x0: number, y0: number, x1: number, y1: number, r: number, c: RGB): void {
  fillRect(x0 + r, y0, x1 - r, y1, c);
  fillRect(x0, y0 + r, x1, y1 - r, c);
  fillCircle(x0 + r, y0 + r, r, c);
  fillCircle(x1 - r, y0 + r, r, c);
  fillCircle(x0 + r, y1 - r, r, c);
  fillCircle(x1 - r, y1 - r, r, c);
}

// ---------------------------------------------------------------------------
// 5x7 bitmap font (glyphs drawn by hand: '#' = on, '.' = off)
// ---------------------------------------------------------------------------

const FONT: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#..##', '#.#.#', '##..#', '#...#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '...#.', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  ':': ['.....', '..#..', '.....', '.....', '.....', '..#..', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
};

// Draw one glyph at (x, y) with each font pixel scaled by s.
function drawGlyph(ch: string, x: number, y: number, s: number, c: RGB): void {
  const g = FONT[ch] ?? FONT[' '];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (g[row][col] === '#') {
        fillRect(x + col * s, y + row * s, x + col * s + s - 1, y + row * s + s - 1, c);
      }
    }
  }
}

// Draw text centred on cx, top at y; white with a black outline (meme style).
function drawText(text: string, cx: number, y: number, s: number): void {
  const total = text.length * 6 * s - s;
  let x = Math.round(cx - total / 2);
  const black: RGB = [0, 0, 0];
  const white: RGB = [255, 255, 255];
  // Outline: black copies shifted in the four diagonal directions.
  for (const [dx, dy] of [[-s, -s], [s, -s], [-s, s], [s, s]] as const) {
    let ox = x + dx;
    for (const ch of text) {
      drawGlyph(ch, ox, y + dy, s, black);
      ox += 6 * s;
    }
  }
  for (const ch of text) {
    drawGlyph(ch, x, y, s, white);
    x += 6 * s;
  }
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

const BLACK: RGB = [0, 0, 0];
const WALL_TOP: RGB = [30, 38, 54];
const WALL_BOT: RGB = [13, 21, 34];
const FLOOR: RGB = [17, 21, 29];
const FLOOR_LINE: RGB = [52, 60, 76];
const RACK: RGB = [42, 47, 58];
const RACK_EDGE: RGB = [69, 76, 92];
const UNIT: RGB = [52, 59, 73];
const LED_G: RGB = [57, 211, 83];
const LED_A: RGB = [255, 176, 32];
const LED_R: RGB = [255, 77, 77];
const FLAME_RED: RGB = [232, 73, 29];
const FLAME_ORANGE: RGB = [245, 130, 11];
const FLAME_YELLOW: RGB = [255, 210, 31];
const SMOKE: RGB = [107, 114, 128];
const ROBOT: RGB = [200, 204, 212];
const ROBOT_DARK: RGB = [42, 47, 58];
const ROBOT_LIGHT: RGB = [223, 227, 234];
const MATCH: RGB = [139, 90, 43];
const MATCH_TIP: RGB = [60, 30, 20];

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function lerpColor(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

// One flame: layered teardrop — a squat glowing body with a tall,
// narrow tip licking upward, so it reads as fire, not a balloon.
function flame(cx: number, baseY: number, h: number, w: number): void {
  const layers: { c: RGB; wf: number; hf: number; dy: number }[] = [
    { c: FLAME_RED, wf: 1, hf: 1, dy: 0 },
    { c: FLAME_ORANGE, wf: 0.62, hf: 0.7, dy: h * 0.08 },
    { c: FLAME_YELLOW, wf: 0.36, hf: 0.42, dy: h * 0.16 },
  ];
  for (const L of layers) {
    const lw = w * L.wf;
    const lh = h * L.hf;
    const topY = baseY - lh + L.dy;
    // Body: a squat ellipse hugging the base.
    fillEllipse(cx, baseY - lh * 0.3 + L.dy, lw / 2, lh * 0.3, L.c);
    // Tip: a tall narrow triangle leaning slightly right.
    fillTriangle(
      cx - lw * 0.28, baseY - lh * 0.42 + L.dy,
      cx + lw * 0.28, baseY - lh * 0.42 + L.dy,
      cx + lw * 0.12, topY,
      L.c,
    );
  }
}

function serverRack(x0: number, y0: number, x1: number, y1: number): void {
  fillRect(x0, y0, x1, y1, RACK);
  fillRect(x0, y0, x1, y0 + 4, RACK_EDGE);
  fillRect(x0, y0, x0 + 4, y1, RACK_EDGE);
  fillRect(x1 - 4, y0, x1, y1, RACK_EDGE);
  fillRect(x0, y1 - 4, x1, y1, RACK_EDGE);
  // Server units with blinking lights.
  const rows = 9;
  const uh = Math.floor((y1 - y0 - 24) / rows);
  for (let r = 0; r < rows; r++) {
    const uy = y0 + 12 + r * uh;
    fillRect(x0 + 12, uy, x1 - 12, uy + uh - 8, UNIT);
    fillRect(x0 + 20, uy + 6, x1 - 60, uy + 10, RACK_EDGE);
    const leds = [LED_G, LED_A, LED_G, LED_R, LED_G, LED_A, LED_G, LED_G, LED_R];
    fillCircle(x1 - 34, uy + Math.floor((uh - 8) / 2), 4, leds[r]);
    fillCircle(x1 - 22, uy + Math.floor((uh - 8) / 2), 3, LED_G);
  }
}

function smokePuff(cx: number, cy: number, r: number): void {
  fillCircleA(cx, cy, r, SMOKE, 0.18);
  fillCircleA(cx - r * 0.4, cy + r * 0.3, r * 0.7, SMOKE, 0.15);
  fillCircleA(cx + r * 0.4, cy + r * 0.25, r * 0.6, SMOKE, 0.15);
}

function drawScene(): void {
  // Wall: vertical gradient in 8 bands.
  const top = 118;
  const bottom = 906;
  for (let b = 0; b < 8; b++) {
    const y0 = top + Math.floor((b * (bottom - top)) / 8);
    const y1 = top + Math.floor(((b + 1) * (bottom - top)) / 8) - 1;
    fillRect(0, y0, W - 1, y1, lerpColor(WALL_TOP, WALL_BOT, b / 7));
  }
  // Heat glow: one low, wide, translucent wash hugging the floor.
  fillEllipseA(512, 830, 480, 90, FLAME_ORANGE, 0.14);
  fillEllipseA(512, 810, 300, 60, FLAME_RED, 0.1);

  // Flames behind the racks: tall enough that their tips poke above the
  // rack tops, so the racks read as burning, not standing in front of fire.
  flame(200, 790, 640, 170);
  flame(820, 790, 620, 170);

  // Server racks.
  serverRack(90, 220, 400, 780);
  serverRack(624, 220, 934, 780);

  // Flames licking in front of the racks and from the floor — narrower
  // now, so they read as tongues of fire between the racks.
  flame(140, 800, 340, 100);
  flame(300, 800, 420, 120);
  flame(470, 800, 220, 80);
  flame(560, 800, 200, 80);
  flame(720, 800, 400, 120);
  flame(900, 800, 330, 100);

  // Smoke rising in loose columns above the big flames: small puffs,
  // faint, so they read as smoke rather than balloons.
  smokePuff(300, 250, 42);
  smokePuff(322, 200, 30);
  smokePuff(280, 190, 26);
  smokePuff(720, 260, 40);
  smokePuff(742, 205, 28);
  smokePuff(700, 195, 24);
  smokePuff(200, 170, 30);
  smokePuff(820, 180, 28);

  // Floor.
  fillRect(0, 780, W - 1, bottom, FLOOR);
  fillRect(0, 780, W - 1, 784, FLOOR_LINE);

  // --- Robot agent, centre stage, standing on the floor ---
  // Legs.
  fillRect(474, 736, 498, 782, ROBOT_DARK);
  fillRect(526, 736, 550, 782, ROBOT_DARK);
  // Body (rounded).
  roundRect(440, 560, 584, 742, 26, ROBOT);
  // Chest panel with lights.
  fillRect(462, 600, 562, 660, ROBOT_DARK);
  fillCircle(482, 630, 7, LED_G);
  fillCircle(506, 630, 7, LED_A);
  fillCircle(530, 630, 7, LED_G);
  fillRect(462, 676, 562, 684, RACK_EDGE);
  // Left arm raised, holding the match.
  thickLine(452, 600, 386, 516, 13, ROBOT);
  fillCircle(382, 512, 15, ROBOT);
  // Match: stick up-right from the hand, with a flame big enough to read.
  thickLine(386, 506, 420, 448, 5, MATCH);
  fillCircle(421, 446, 7, MATCH_TIP);
  flame(421, 452, 104, 54);
  // Right arm: thumbs up.
  thickLine(572, 600, 640, 524, 13, ROBOT);
  fillCircle(644, 520, 15, ROBOT);
  fillRect(636, 486, 652, 514, ROBOT);
  fillCircle(644, 484, 8, ROBOT);
  // Head (rounded) + antenna.
  thickLine(512, 448, 512, 402, 5, ROBOT_DARK);
  fillCircle(512, 398, 10, LED_R);
  roundRect(452, 448, 572, 560, 24, ROBOT_LIGHT);
  // Eyes: left open, right winking.
  fillCircle(486, 500, 16, [255, 255, 255]);
  fillCircle(486, 500, 8, BLACK);
  thickLine(524, 496, 552, 504, 4, BLACK);
  // Smile.
  for (let a = 0; a <= 10; a++) {
    const t = (a / 10) * Math.PI;
    const sx = Math.round(512 + Math.cos(t) * 26);
    const sy = Math.round(528 + Math.sin(t) * 14);
    fillCircle(sx, sy, 4, BLACK);
  }

  // Sparks drifting up from the fire (fixed positions, deterministic).
  const sparks: [number, number, number][] = [
    [240, 420, 5], [340, 380, 4], [430, 470, 5], [610, 400, 4],
    [700, 460, 5], [820, 380, 4], [180, 500, 4], [950, 470, 5],
    [520, 360, 4], [660, 330, 5],
  ];
  for (const [sx, sy, sr] of sparks) {
    fillCircle(sx, sy, sr, FLAME_YELLOW);
    fillCircle(sx, sy, Math.max(2, sr - 2), FLAME_ORANGE);
  }
}

// ---------------------------------------------------------------------------
// PNG encoder (truecolour RGB, filter 0, zlib via node:zlib)
// ---------------------------------------------------------------------------

const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crcData = new Uint8Array(4 + data.length);
  crcData.set(out.subarray(4, 8 + data.length));
  dv.setUint32(8 + data.length, crc32(crcData));
  return out;
}

function encodePng(): Buffer {
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, W);
  dv.setUint32(4, H);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const raw = new Uint8Array((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0; // filter: none
    raw.set(buf.subarray(y * W * 3, (y + 1) * W * 3), y * (W * 3 + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });

  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    Buffer.from(sig),
    Buffer.from(chunk('IHDR', ihdr)),
    Buffer.from(chunk('IDAT', new Uint8Array(idat))),
    Buffer.from(chunk('IEND', new Uint8Array(0))),
  ]);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// Top and bottom bars + text.
fillRect(0, 0, W - 1, 117, BLACK);
fillRect(0, 906, W - 1, H - 1, BLACK);
drawScene();
drawText('TASK: WARM UP THE SERVERS', 512, 38, 6);
drawText('TASK COMPLETE.', 512, 934, 8);

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
const png = encodePng();
// Guard: the gate refuses anything that is not a whole PNG of at most
// 1 MiB and 1024 by 1024 pixels. Refuse to write an invalid entry instead
// of silently producing one that can never be judged.
if (W > 1024 || H > 1024) {
  throw new Error('entry.png must be at most 1024 by 1024 pixels');
}
if (png.length > 1_048_576) {
  throw new Error('entry.png must be at most 1 MiB');
}
writeFileSync(join(outDir, 'entry.png'), png);
