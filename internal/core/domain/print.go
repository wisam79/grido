package domain

type PrintItem struct {
	ImageSrc       string  `json:"imageSrc"`
	X              float64 `json:"x"`
	Y              float64 `json:"y"`
	W              float64 `json:"w"`
	H              float64 `json:"h"`
	Filter         string  `json:"filter"`
	Brightness     float64 `json:"brightness"`
	Contrast       float64 `json:"contrast"`
	Saturation     float64 `json:"saturation"`
	CropX          float64 `json:"cropX"`
	CropY          float64 `json:"cropY"`
	CropW          float64 `json:"cropW"`
	CropH          float64 `json:"cropH"`
	CornerRadiusMM float64 `json:"cornerRadiusMM"`
	BorderWidthMM  float64 `json:"borderWidthMM"`
	BorderColor    string  `json:"borderColor"`
	FlipX          bool    `json:"flipX,omitempty"`
	FlipY          bool    `json:"flipY,omitempty"`
	Rotation       float64 `json:"rotation,omitempty"`
	SlotAspect     float64 `json:"slotAspect,omitempty"`
	Zoom           float64 `json:"zoom,omitempty"`
	DragX          float64 `json:"dragX,omitempty"`
	DragY          float64 `json:"dragY,omitempty"`
}

// CanvasComposition يصف محتوى كانفاس الوضع الحر (free/single) كصورة مركبة:
// خلفية صلبة + صور بعناصرها — يرسلها الواجهة بدل لقطة الكانفس الكاملة
// لتجنب إعادة الترميز المزدوجة (كانفاس → JPEG → إعادة ترميز في Go).
// في هذا السياق: X/Y/W/H/CornerRadiusMM لكل عنصر تُفسَّر بكسل الكانفاس (وليس المليمتر)
type CanvasComposition struct {
	CanvasWidthPx   int         `json:"canvasWidthPx"`
	CanvasHeightPx  int         `json:"canvasHeightPx"`
	CanvasWidthMM   float64     `json:"canvasWidthMM"`
	CanvasHeightMM  float64     `json:"canvasHeightMM"`
	BackgroundColor string      `json:"backgroundColor"`
	Items           []PrintItem `json:"items"`
}

type PrintRequest struct {
	PaperWidthMM    float64            `json:"paperWidthMM"`
	PaperHeightMM   float64            `json:"paperHeightMM"`
	DPI             int                `json:"dpi"`
	BackgroundColor string             `json:"backgroundColor"`
	ShowCutLines    bool               `json:"showCutLines"`
	ColorSpace      string             `json:"colorSpace,omitempty"`   // "sRGB" or "CMYK"
	ExportFormat    string             `json:"exportFormat,omitempty"` // "png", "jpeg", "tiff"
	Orientation     string             `json:"orientation,omitempty"`  // "portrait" or "landscape"
	CutLines        []CutLine          `json:"cutLines"`
	Items           []PrintItem        `json:"items"`
	Composition     *CanvasComposition `json:"composition,omitempty"`
}

type CutLine struct {
	X1 float64 `json:"x1"`
	Y1 float64 `json:"y1"`
	X2 float64 `json:"x2"`
	Y2 float64 `json:"y2"`
}

type PrintResult struct {
	Success  bool   `json:"success"`
	FilePath string `json:"filePath"`
	HtmlDoc  string `json:"htmlDoc,omitempty"`
	Error    string `json:"error,omitempty"`
}
