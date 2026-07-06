package domain

type PrintItem struct {
	ImageSrc   string  `json:"imageSrc"`
	X          float64 `json:"x"`
	Y          float64 `json:"y"`
	W          float64 `json:"w"`
	H          float64 `json:"h"`
	Filter     string  `json:"filter"`
	Brightness float64 `json:"brightness"`
	Contrast   float64 `json:"contrast"`
	Saturation float64 `json:"saturation"`
}

type PrintRequest struct {
	PaperWidthMM    float64     `json:"paperWidthMM"`
	PaperHeightMM   float64     `json:"paperHeightMM"`
	DPI             int         `json:"dpi"`
	BackgroundColor string      `json:"backgroundColor"`
	ShowCutLines    bool        `json:"showCutLines"`
	CutLines        []CutLine   `json:"cutLines"`
	Items           []PrintItem `json:"items"`
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
	Error    string `json:"error,omitempty"`
}
