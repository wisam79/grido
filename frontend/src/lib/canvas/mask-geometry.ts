export const MASK_SHAPES = [
  'none',
  'circle',
  'arch',
  'hexagon',
  'diamond',
  'heart',
  'star',
  'seal',
] as const;

export type MaskShape = (typeof MASK_SHAPES)[number];

type MaskCommand =
  | ['M' | 'L', number, number]
  | ['C', number, number, number, number, number, number]
  | ['A', number, number, number, number, number]
  | ['Z'];

export type MaskPathContext = Pick<
  CanvasRenderingContext2D,
  'beginPath' | 'moveTo' | 'lineTo' | 'bezierCurveTo' | 'arc' | 'closePath'
>;

/** Local element coordinates, independent of Konva, DOM, zoom and output DPI. */
export function buildMaskPath(shape: MaskShape | undefined, w: number, h: number): MaskCommand[] {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return [];
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) / 2;

  switch (shape) {
    case 'circle':
      return [
        ['M', cx + radius, cy],
        ['A', cx, cy, radius, 0, Math.PI],
        ['A', cx, cy, radius, Math.PI, Math.PI * 2],
        ['Z'],
      ];
    case 'arch': {
      const shoulder = h / 2;
      const k = 0.5522847498307936;
      return [
        ['M', 0, h],
        ['L', 0, shoulder],
        ['C', 0, shoulder * (1 - k), cx * (1 - k), 0, cx, 0],
        ['C', cx * (1 + k), 0, w, shoulder * (1 - k), w, shoulder],
        ['L', w, h],
        ['Z'],
      ];
    }
    case 'hexagon':
      return [
        ['M', w / 4, 0],
        ['L', (w * 3) / 4, 0],
        ['L', w, cy],
        ['L', (w * 3) / 4, h],
        ['L', w / 4, h],
        ['L', 0, cy],
        ['Z'],
      ];
    case 'diamond':
      return [['M', cx, 0], ['L', w, cy], ['L', cx, h], ['L', 0, cy], ['Z']];
    case 'heart': {
      // Keep the legacy heart contour so existing projects do not change shape.
      const top = h * 0.3;
      const middle = (h + top) / 2;
      return [
        ['M', cx, top],
        ['C', cx, 0, 0, 0, 0, top],
        ['C', 0, middle, cx, middle, cx, h],
        ['C', cx, middle, w, middle, w, top],
        ['C', w, 0, cx, 0, cx, top],
        ['Z'],
      ];
    }
    case 'star':
    case 'seal': {
      const points = shape === 'star' ? 5 : 12;
      const inner = radius * (shape === 'star' ? 0.5 : 0.86);
      const commands: MaskCommand[] = [];
      for (let i = 0; i < points * 2; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI) / points;
        const r = i % 2 === 0 ? radius : inner;
        commands.push([i === 0 ? 'M' : 'L', cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
      }
      commands.push(['Z']);
      return commands;
    }
    default:
      return [['M', 0, 0], ['L', w, 0], ['L', w, h], ['L', 0, h], ['Z']];
  }
}

export function traceMaskPath(ctx: MaskPathContext, commands: readonly MaskCommand[]): void {
  ctx.beginPath();
  for (const command of commands) {
    switch (command[0]) {
      case 'M':
        ctx.moveTo(command[1], command[2]);
        break;
      case 'L':
        ctx.lineTo(command[1], command[2]);
        break;
      case 'C':
        ctx.bezierCurveTo(command[1], command[2], command[3], command[4], command[5], command[6]);
        break;
      case 'A':
        ctx.arc(command[1], command[2], command[3], command[4], command[5]);
        break;
      case 'Z':
        ctx.closePath();
        break;
    }
  }
}

/** The picker displays the same commands as the canvas, not approximate icon glyphs. */
export function maskPathToSvg(commands: readonly MaskCommand[]): string {
  return commands
    .map((command) => {
      if (command[0] !== 'A') return command.join(' ');
      const [, cx, cy, r, start, end] = command;
      const x = cx + Math.cos(end) * r;
      const y = cy + Math.sin(end) * r;
      return `A ${r} ${r} 0 ${end - start > Math.PI ? 1 : 0} 1 ${x} ${y}`;
    })
    .join(' ');
}
