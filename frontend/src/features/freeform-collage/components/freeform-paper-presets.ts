export interface PaperPresetOption {
  id: string;
  name: string;
  w: number;
  h: number;
}

export const COMMON_PAPER_PRESETS: PaperPresetOption[] = [
  { id: "4x6", name: "4×6 بوصة (102×152 مم)", w: 102, h: 152 },
  { id: "5x7", name: "5×7 بوصة (127×178 مم)", w: 127, h: 178 },
  { id: "6x8", name: "6×8 بوصة (152×203 مم)", w: 152, h: 203 },
  { id: "8x10", name: "8×10 بوصة (203×254 مم)", w: 203, h: 254 },
  { id: "10x15cm", name: "10×15 سم (100×150 مم)", w: 100, h: 150 },
  { id: "13x18cm", name: "13×18 سم (130×180 مم)", w: 130, h: 180 },
  { id: "a4", name: "ورقة A4 (210×297 مم)", w: 210, h: 297 },
  { id: "a5", name: "ورقة A5 (148×210 مم)", w: 148, h: 210 },
  { id: "a3", name: "ورقة A3 (297×420 مم)", w: 297, h: 420 },
  { id: "letter", name: "Letter (216×279 مم)", w: 216, h: 279 },
  { id: "sq10", name: "مربع (100×100 مم)", w: 100, h: 100 },
];
