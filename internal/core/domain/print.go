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
	BgColor        string  `json:"bgColor,omitempty"`
	FlipX          bool    `json:"flipX,omitempty"`
	FlipY          bool    `json:"flipY,omitempty"`
	Rotation       float64 `json:"rotation,omitempty"`
	SlotAspect     float64 `json:"slotAspect,omitempty"`
	Zoom           float64 `json:"zoom,omitempty"`
	DragX          float64 `json:"dragX,omitempty"`
	DragY          float64 `json:"dragY,omitempty"`

	// تكرار شبكي على جانب Go: عنصر واحد يمثل قالب خانة يُستنسخ Copies مرة
	// بمسافة CopyStepX/CopyStepY بالمليمتر (عمودياً بعد CopyCols عموداً).
	// يقطع تكرار العناصر عبر جسر Wails JSON — شبكة 48×24 كانت ترسل حتى 2,304
	// عنصراً مكرراً وتصطدم بحد التحقق 1000. القيمة صفر = عنصر عادي.
	Copies    int     `json:"copies,omitempty"`
	CopyCols  int     `json:"copyCols,omitempty"`
	CopyStepX float64 `json:"copyStepX,omitempty"`
	CopyStepY float64 `json:"copyStepY,omitempty"`
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
	MarginMM        float64            `json:"marginMM,omitempty"`
	GapMM           float64            `json:"gapMM,omitempty"`
	DPI             int                `json:"dpi"`
	BackgroundColor string             `json:"backgroundColor"`
	ShowCutLines    bool               `json:"showCutLines"`
	CutLineStyle    string             `json:"cutLineStyle,omitempty"` // "dashed", "dotted", "solid", "cropmarks"
	ColorSpace      string             `json:"colorSpace,omitempty"`   // "sRGB" or "CMYK"
	ExportFormat    string             `json:"exportFormat,omitempty"` // "png", "jpeg", "tiff", "pdf"
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

// PrinterInfo يصف طابعة مثبتة في نظام التشغيل — يُستخدم لعرض قائمة
// الطابعات الحقيقية في شاشة الطباعة (Backstage View) بدل خيارات مجردة.
type PrinterInfo struct {
	Name      string `json:"name"`
	IsDefault bool   `json:"isDefault"`
}

// PrintersResult نتيجة استعلام الطابعات المثبتة للواجهة الأمامية.
type PrintersResult struct {
	Success  bool          `json:"success"`
	Printers []PrinterInfo `json:"printers"`
	Error    string        `json:"error,omitempty"`
}

// DirectPrintRequest طلب طباعة مباشرة للمهمة إلى طابعة معينة عبر Win32 GDI Spooler
type DirectPrintRequest struct {
	PrinterName   string  `json:"printerName"`
	FilePath      string  `json:"filePath"`
	JobTitle      string  `json:"jobTitle,omitempty"`
	PaperWidthMM  float64 `json:"paperWidthMM,omitempty"`
	PaperHeightMM float64 `json:"paperHeightMM,omitempty"`
	Orientation   string  `json:"orientation,omitempty"` // "portrait" or "landscape"
	Copies        int     `json:"copies,omitempty"`
	Color         bool    `json:"color,omitempty"`
	Borderless    bool    `json:"borderless,omitempty"`
	FormName      string  `json:"formName,omitempty"`
}

// DirectPrintResult نتيجة إرسال المهمة المباشرة إلى طابور الطباعة
type DirectPrintResult struct {
	Success bool   `json:"success"`
	JobID   int32  `json:"jobId,omitempty"`
	Status  string `json:"status,omitempty"`
	Error   string `json:"error,omitempty"`
}

// SupportedPaperInfo معلومات قالب الورق الذي يدعمه برنامج تشغيل الطابعة
type SupportedPaperInfo struct {
	ID           uint16  `json:"id"`
	Name         string  `json:"name"`
	WidthMM      float64 `json:"widthMM"`
	HeightMM     float64 `json:"heightMM"`
	IsBorderless bool    `json:"isBorderless"`
}

// SupportedPapersResult نتيجة استعلام قوالب الورق المدعومة من الطابعة
type SupportedPapersResult struct {
	Success bool                 `json:"success"`
	Papers  []SupportedPaperInfo `json:"papers"`
	Error   string               `json:"error,omitempty"`
}
