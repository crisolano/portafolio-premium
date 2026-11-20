// 8-bit Cristian: 12 × 20 pixel frames. One character per pixel, '.' is transparent.
export const PALETTE: Record<string, string> = {
  O: '#1b1f24', // outline
  H: '#b07a45', // hair
  h: '#8a5b2f', // hair shadow
  S: '#f4cfb0', // skin
  s: '#e0ac88', // skin shadow
  E: '#1b1f24', // eyes
  G: '#8e959c', // hoodie
  g: '#6c737b', // hoodie shadow
  L: '#b4bac0', // hoodie light
  W: '#eef1f4', // drawstrings
  P: '#2c3648', // jeans
  B: '#14171b', // shoes
}

const head = [
  '...OOOOOO...',
  '..OHHHHHHO..',
  '.OHHHHHHHHO.',
  '.OHHHHHHHhO.',
  '.OHhSHHShhO.',
]

const headBack = [
  '...OOOOOO...',
  '..OHHHHHHO..',
  '.OHHHHHHHHO.',
  '.OHHHHHHHhO.',
  '.OHHHhHHhHO.',
]

const face = [
  '.OSSSSSSSSO.',
  'OOSESSSSESOO',
  'OsSSSSSSSSsO',
  '..OSSssSSO..',
  '...OOSSOO...',
]

const blink = [
  '.OSSSSSSSSO.',
  'OOSOOSSOOSOO',
  'OsSSSSSSSSsO',
  '..OSSssSSO..',
  '...OOSSOO...',
]

const back = [
  '.OHhHHhHHhO.',
  'OOHhHHhHHhOO',
  'OsHHHHHHHHsO',
  '..OhHHHHhO..',
  '...OOSSOO...',
]

const body = [
  '..OGGLLGGO..',
  '.OGGWGGWGGO.',
  'OGLGWGGWGLGO',
  'OGLGGGGGGLGO',
  'OSOGGggGGOSO',
  '.O.OGGGGO.O.',
]

const bodyBack = [
  '..OGGLLGGO..',
  '.OGGGGGGGGO.',
  'OGLGGGGGGLGO',
  'OGLGgggGGLGO',
  'OSOGGGGGGOSO',
  '.O.OGGGGO.O.',
]

const legs = {
  stand: [
    '...OPPPPO...',
    '...OPPOPPO..',
    '...OPO.OPO..',
    '..OBBO.OBBO.',
  ],
  left: [
    '...OPPPPO...',
    '..OPPOOPPO..',
    '..OPO..OBBO.',
    '.OBBO.......',
  ],
  right: [
    '...OPPPPO...',
    '..OPPOOPPO..',
    '.OBBO..OPO..',
    '.......OBBO.',
  ],
}

export const FRAMES = {
  idle: [...head, ...face, ...body, ...legs.stand],
  blink: [...head, ...blink, ...body, ...legs.stand],
  downA: [...head, ...face, ...body, ...legs.left],
  downB: [...head, ...face, ...body, ...legs.right],
  upA: [...headBack, ...back, ...bodyBack, ...legs.left],
  upB: [...headBack, ...back, ...bodyBack, ...legs.right],
}

export type FrameName = keyof typeof FRAMES

// Collapse each row into horizontal runs of one colour, so a frame is a handful of rects.
export function toRects(frame: string[]) {
  const rects: { x: number; y: number; w: number; fill: string }[] = []
  frame.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const c = row[x]
      let w = 1
      while (row[x + w] === c) w++
      if (c !== '.' && PALETTE[c]) rects.push({ x, y, w, fill: PALETTE[c] })
      x += w
    }
  })
  return rects
}
