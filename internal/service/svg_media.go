package service

import (
	"bytes"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"math"
	"strconv"
	"strings"
)

// MaxSVGFileSize يحدّد الحجم الأقصى المسموح به لملفات SVG المستوردة لحماية الذاكرة والتعقيم.
const MaxSVGFileSize = 5 * 1024 * 1024 // 5 MiB

const (
	svgNamespace   = "http://www.w3.org/2000/svg"
	xlinkNamespace = "http://www.w3.org/1999/xlink"
	xmlNamespace   = "http://www.w3.org/XML/1998/namespace"
	svgMinTargetPx = 1024.0
)

var (
	errSVGEmpty       = errors.New("empty svg payload")
	errSVGTooLarge    = errors.New("svg payload exceeds maximum allowed size")
	errSVGEntityFound = errors.New("svg entity declarations are forbidden")
	errSVGInvalidRoot = errors.New("svg root element must be <svg>")
)

var forbiddenSVGElements = map[string]bool{
	"script":           true,
	"foreignobject":    true,
	"iframe":           true,
	"object":           true,
	"embed":            true,
	"handler":          true,
	"audio":            true,
	"video":            true,
	"source":           true,
	"track":            true,
	"form":             true,
	"input":            true,
	"button":           true,
	"textarea":         true,
	"link":             true,
	"meta":             true,
	"base":             true,
	"animate":          true,
	"animatemotion":    true,
	"animatetransform": true,
	"set":              true,
	"mpath":            true,
	"discard":          true,
}

// LooksLikeSVG يتحقق من ترويسة البايتات للتأكد من أنها وثيقة SVG وليست HTML أو نصاً عادياً.
func LooksLikeSVG(head []byte) bool {
	trimmed := bytes.TrimSpace(bytes.TrimPrefix(head, []byte("\xEF\xBB\xBF")))
	if len(trimmed) == 0 || trimmed[0] != '<' {
		return false
	}
	lower := bytes.ToLower(trimmed)
	if bytes.Contains(lower, []byte("<!doctype html")) || bytes.Contains(lower, []byte("<html")) {
		return false
	}
	idx := bytes.Index(lower, []byte("<svg"))
	if idx < 0 {
		return false
	}
	after := idx + len("<svg")
	if after >= len(lower) {
		return true
	}
	next := lower[after]
	return next == '>' || next == '/' || next == ' ' || next == '\t' || next == '\n' || next == '\r'
}

func stripASCIIControlsAndSpace(s string) string {
	var b strings.Builder
	b.Grow(len(s))
	for i := 0; i < len(s); i++ {
		if s[i] > 0x20 && s[i] != 0x7f {
			b.WriteByte(s[i])
		}
	}
	return b.String()
}

func hasDangerousSVGText(val string) bool {
	compact := strings.ToLower(stripASCIIControlsAndSpace(val))
	return strings.Contains(compact, "javascript:") ||
		strings.Contains(compact, "vbscript:") ||
		strings.Contains(compact, "expression(") ||
		strings.Contains(compact, "@import")
}

func isSafeSVGDataImage(compactLower string) bool {
	return strings.HasPrefix(compactLower, "data:image/png;") ||
		strings.HasPrefix(compactLower, "data:image/jpeg;") ||
		strings.HasPrefix(compactLower, "data:image/jpg;") ||
		strings.HasPrefix(compactLower, "data:image/gif;") ||
		strings.HasPrefix(compactLower, "data:image/webp;")
}

func isSafeSVGReferenceURL(val string) bool {
	compact := stripASCIIControlsAndSpace(val)
	if compact == "" || strings.HasPrefix(compact, "#") {
		return true
	}
	return isSafeSVGDataImage(strings.ToLower(compact))
}

func hasUnsafeCSSUrl(css string, allowFontData bool) bool {
	compact := strings.ToLower(stripASCIIControlsAndSpace(css))
	if hasDangerousSVGText(css) {
		return true
	}
	searchFrom := 0
	for {
		idx := strings.Index(compact[searchFrom:], "url(")
		if idx < 0 {
			return false
		}
		rest := compact[searchFrom+idx+len("url("):]
		rest = strings.TrimLeft(rest, `"'`)
		isLocal := strings.HasPrefix(rest, "#")
		isSafeFont := allowFontData &&
			(strings.HasPrefix(rest, "data:font/") ||
				strings.HasPrefix(rest, "data:application/font") ||
				strings.HasPrefix(rest, "data:application/x-font"))
		if !isLocal && !isSafeFont {
			return true
		}
		searchFrom += idx + len("url(")
	}
}

func isSafeSVGStyleElement(css string) bool {
	return !hasUnsafeCSSUrl(css, true)
}

func writeXMLText(buf *bytes.Buffer, s string) {
	_ = xml.EscapeText(buf, []byte(s))
}

func writeSanitizedStartTag(
	buf *bytes.Buffer,
	se xml.StartElement,
	isRoot bool,
	includeXlink bool,
) {
	tag := se.Name.Local
	buf.WriteByte('<')
	buf.WriteString(tag)

	if isRoot {
		buf.WriteString(` xmlns="`)
		buf.WriteString(svgNamespace)
		buf.WriteByte('"')
		if includeXlink {
			buf.WriteString(` xmlns:xlink="`)
			buf.WriteString(xlinkNamespace)
			buf.WriteByte('"')
		}
	}

	seenAttrs := make(map[string]bool, len(se.Attr))
	for _, attr := range se.Attr {
		localLower := strings.ToLower(attr.Name.Local)
		if localLower == "" || localLower == "xmlns" || attr.Name.Space == "xmlns" {
			continue
		}
		var attrName string
		switch attr.Name.Space {
		case "", svgNamespace:
			attrName = attr.Name.Local
		case xlinkNamespace:
			attrName = "xlink:" + attr.Name.Local
		case xmlNamespace:
			attrName = "xml:" + attr.Name.Local
		default:
			// تجاهل سمات مساحات الأسماء المجهولة منعاً لأخطاء البادئات غير المعلنة
			continue
		}

		if strings.HasPrefix(localLower, "on") {
			continue
		}
		if hasDangerousSVGText(attr.Value) {
			continue
		}
		if (localLower == "href" || localLower == "src" || localLower == "data") &&
			!isSafeSVGReferenceURL(attr.Value) {
			continue
		}
		if localLower == "style" && hasUnsafeCSSUrl(attr.Value, false) {
			continue
		}

		key := strings.ToLower(attrName)
		if seenAttrs[key] {
			continue
		}
		seenAttrs[key] = true

		buf.WriteByte(' ')
		buf.WriteString(attrName)
		buf.WriteString(`="`)
		writeXMLText(buf, attr.Value)
		buf.WriteByte('"')
	}

	buf.WriteByte('>')
}

// SanitizeSVGBytes يعقّم ملف SVG عبر encoding/xml القياسية ويرفض الإعلانات والوسوم والروابط الخطرة.
func SanitizeSVGBytes(raw []byte) ([]byte, error) {
	if len(bytes.TrimSpace(raw)) == 0 {
		return nil, errSVGEmpty
	}
	if len(raw) > MaxSVGFileSize {
		return nil, errSVGTooLarge
	}
	if bytes.Contains(bytes.ToLower(raw), []byte("<!entity")) {
		return nil, errSVGEntityFound
	}

	needsXlink := bytes.Contains(raw, []byte(xlinkNamespace)) || bytes.Contains(raw, []byte("xlink:"))
	dec := xml.NewDecoder(bytes.NewReader(raw))

	var out bytes.Buffer
	out.Grow(len(raw))

	rootStarted := false
	rootClosed := false
	skipDepth := 0
	inStyle := false
	var styleBuf strings.Builder
	var pendingStyleTag xml.StartElement
	var stack []string

	for {
		tok, err := dec.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("parse svg xml: %w", err)
		}

		switch t := tok.(type) {
		case xml.StartElement:
			if rootClosed {
				return nil, errSVGInvalidRoot
			}
			localLower := strings.ToLower(t.Name.Local)
			if !rootStarted {
				if localLower != "svg" || (t.Name.Space != "" && t.Name.Space != svgNamespace) {
					return nil, errSVGInvalidRoot
				}
				rootStarted = true
				stack = append(stack, t.Name.Local)
				writeSanitizedStartTag(&out, t, true, needsXlink)
				continue
			}

			if skipDepth > 0 || inStyle {
				skipDepth++
				continue
			}
			if forbiddenSVGElements[localLower] {
				skipDepth = 1
				continue
			}
			if localLower == "style" {
				inStyle = true
				styleBuf.Reset()
				pendingStyleTag = t
				continue
			}

			stack = append(stack, t.Name.Local)
			writeSanitizedStartTag(&out, t, false, false)

		case xml.EndElement:
			if !rootStarted {
				continue
			}
			if skipDepth > 0 {
				skipDepth--
				continue
			}
			if inStyle && strings.EqualFold(t.Name.Local, "style") {
				css := styleBuf.String()
				if isSafeSVGStyleElement(css) {
					writeSanitizedStartTag(&out, pendingStyleTag, false, false)
					writeXMLText(&out, css)
					out.WriteString("</style>")
				}
				inStyle = false
				styleBuf.Reset()
				continue
			}
			if len(stack) == 0 {
				return nil, errSVGInvalidRoot
			}
			tag := stack[len(stack)-1]
			stack = stack[:len(stack)-1]
			out.WriteString("</")
			out.WriteString(tag)
			out.WriteByte('>')
			if len(stack) == 0 {
				rootClosed = true
			}

		case xml.CharData:
			if !rootStarted || rootClosed {
				if len(bytes.TrimSpace(t)) > 0 {
					return nil, errSVGInvalidRoot
				}
				continue
			}
			if skipDepth > 0 {
				continue
			}
			if inStyle {
				styleBuf.Write(t)
				continue
			}
			writeXMLText(&out, string(t))

		case xml.Comment, xml.ProcInst, xml.Directive:
			// تجاهل التعليقات وإعلانات DOCTYPE/ProcessingInstructions أثناء التعقيم
			continue
		}
	}

	if !rootStarted || !rootClosed {
		return nil, errSVGInvalidRoot
	}
	return out.Bytes(), nil
}

func parseSVGLengthPx(raw string) (float64, bool) {
	s := strings.TrimSpace(strings.ToLower(raw))
	if s == "" || strings.HasSuffix(s, "%") {
		return 0, false
	}
	type unitScale struct {
		suffix string
		scale  float64
	}
	units := []unitScale{
		{suffix: "px", scale: 1},
		{suffix: "pt", scale: 96.0 / 72.0},
		{suffix: "pc", scale: 16.0},
		{suffix: "in", scale: 96.0},
		{suffix: "cm", scale: 96.0 / 2.54},
		{suffix: "mm", scale: 96.0 / 25.4},
	}
	scale := 1.0
	for _, u := range units {
		if strings.HasSuffix(s, u.suffix) {
			s = strings.TrimSpace(strings.TrimSuffix(s, u.suffix))
			scale = u.scale
			break
		}
	}
	val, err := strconv.ParseFloat(s, 64)
	if err != nil || math.IsNaN(val) || math.IsInf(val, 0) || val <= 0 {
		return 0, false
	}
	px := val * scale
	if math.IsNaN(px) || math.IsInf(px, 0) || px <= 0 {
		return 0, false
	}
	return px, true
}

func parseSVGViewBox(raw string) (float64, float64, bool) {
	parts := strings.FieldsFunc(raw, func(r rune) bool {
		return r == ',' || r == ' ' || r == '\t' || r == '\n' || r == '\r'
	})
	if len(parts) != 4 {
		return 0, 0, false
	}
	vals := make([]float64, 4)
	for i, part := range parts {
		v, err := strconv.ParseFloat(part, 64)
		if err != nil || math.IsNaN(v) || math.IsInf(v, 0) {
			return 0, 0, false
		}
		vals[i] = v
	}
	if vals[2] <= 0 || vals[3] <= 0 {
		return 0, 0, false
	}
	return vals[2], vals[3], true
}

// ParseSVGDimensions يستخرج أبعاد SVG بدقة من width/height وviewBox ويُطبع الأبعاد الصغيرة/الكسرية.
func ParseSVGDimensions(raw []byte) (int, int, bool) {
	if len(bytes.TrimSpace(raw)) == 0 || len(raw) > MaxSVGFileSize {
		return 0, 0, false
	}
	if bytes.Contains(bytes.ToLower(raw), []byte("<!entity")) {
		return 0, 0, false
	}

	dec := xml.NewDecoder(bytes.NewReader(raw))
	for {
		tok, err := dec.Token()
		if err != nil {
			return 0, 0, false
		}
		se, ok := tok.(xml.StartElement)
		if !ok {
			continue
		}
		if !strings.EqualFold(se.Name.Local, "svg") || (se.Name.Space != "" && se.Name.Space != svgNamespace) {
			return 0, 0, false
		}

		var widthAttr, heightAttr, viewBoxAttr string
		for _, attr := range se.Attr {
			if attr.Name.Space != "" && attr.Name.Space != svgNamespace {
				continue
			}
			switch strings.ToLower(attr.Name.Local) {
			case "width":
				widthAttr = attr.Value
			case "height":
				heightAttr = attr.Value
			case "viewbox":
				viewBoxAttr = attr.Value
			}
		}

		wVal, hasW := parseSVGLengthPx(widthAttr)
		hVal, hasH := parseSVGLengthPx(heightAttr)
		vbW, vbH, hasVB := parseSVGViewBox(viewBoxAttr)

		var w, h float64
		switch {
		case hasW && hasH:
			w, h = wVal, hVal
		case hasVB && hasW:
			w, h = wVal, wVal*(vbH/vbW)
		case hasVB && hasH:
			w, h = hVal*(vbW/vbH), hVal
		case hasVB:
			w, h = vbW, vbH
		default:
			return 0, 0, false
		}

		if !(w > 0) || !(h > 0) || math.IsNaN(w) || math.IsNaN(h) || math.IsInf(w, 0) || math.IsInf(h, 0) {
			return 0, 0, false
		}

		maxSide := math.Max(w, h)
		isFractional := w != math.Trunc(w) || h != math.Trunc(h)
		if maxSide < svgMinTargetPx || isFractional {
			scale := svgMinTargetPx / maxSide
			w *= scale
			h *= scale
		}

		outW := int(math.Round(w))
		outH := int(math.Round(h))
		if outW < 1 {
			outW = 1
		}
		if outH < 1 {
			outH = 1
		}
		return outW, outH, true
	}
}
