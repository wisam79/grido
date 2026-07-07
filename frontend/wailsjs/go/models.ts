export namespace domain {
	
	export class CutLine {
	    x1: number;
	    y1: number;
	    x2: number;
	    y2: number;
	
	    static createFrom(source: any = {}) {
	        return new CutLine(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.x1 = source["x1"];
	        this.y1 = source["y1"];
	        this.x2 = source["x2"];
	        this.y2 = source["y2"];
	    }
	}
	export class PrintItem {
	    imageSrc: string;
	    x: number;
	    y: number;
	    w: number;
	    h: number;
	    filter: string;
	    brightness: number;
	    contrast: number;
	    saturation: number;
	
	    static createFrom(source: any = {}) {
	        return new PrintItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.imageSrc = source["imageSrc"];
	        this.x = source["x"];
	        this.y = source["y"];
	        this.w = source["w"];
	        this.h = source["h"];
	        this.filter = source["filter"];
	        this.brightness = source["brightness"];
	        this.contrast = source["contrast"];
	        this.saturation = source["saturation"];
	    }
	}
	export class PrintRequest {
	    paperWidthMM: number;
	    paperHeightMM: number;
	    dpi: number;
	    backgroundColor: string;
	    showCutLines: boolean;
	    cutLines: CutLine[];
	    items: PrintItem[];
	
	    static createFrom(source: any = {}) {
	        return new PrintRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.paperWidthMM = source["paperWidthMM"];
	        this.paperHeightMM = source["paperHeightMM"];
	        this.dpi = source["dpi"];
	        this.backgroundColor = source["backgroundColor"];
	        this.showCutLines = source["showCutLines"];
	        this.cutLines = this.convertValues(source["cutLines"], CutLine);
	        this.items = this.convertValues(source["items"], PrintItem);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class PrintResult {
	    success: boolean;
	    filePath: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new PrintResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.filePath = source["filePath"];
	        this.error = source["error"];
	    }
	}
	export class Project {
	    id: string;
	    name: string;
	    mode: string;
	    canvasWidth: number;
	    canvasHeight: number;
	    backgroundColor: string;
	    elements: string;
	    slots: string;
	    template: string;
	    collageTemplate: string;
	    printSettings: string;
	    showGrid: boolean;
	    gridSize: number;
	    gridColor: string;
	    gridOpacity: number;
	    gridSubdivisions: number;
	    gridType: string;
	    snapToGrid: boolean;
	    showColumns: boolean;
	    columnsCount: number;
	    columnsColor: string;
	    columnsMargin: number;
	    columnsGutter: number;
	    collageGap: number;
	    collageMargin: number;
	    collageRadius: number;
	    collageShowCutLines: boolean;
	    collageStrokeWidth: number;
	    collageStrokeColor: string;
	    createdAt: string;
	    updatedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new Project(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.mode = source["mode"];
	        this.canvasWidth = source["canvasWidth"];
	        this.canvasHeight = source["canvasHeight"];
	        this.backgroundColor = source["backgroundColor"];
	        this.elements = source["elements"];
	        this.slots = source["slots"];
	        this.template = source["template"];
	        this.collageTemplate = source["collageTemplate"];
	        this.printSettings = source["printSettings"];
	        this.showGrid = source["showGrid"];
	        this.gridSize = source["gridSize"];
	        this.gridColor = source["gridColor"];
	        this.gridOpacity = source["gridOpacity"];
	        this.gridSubdivisions = source["gridSubdivisions"];
	        this.gridType = source["gridType"];
	        this.snapToGrid = source["snapToGrid"];
	        this.showColumns = source["showColumns"];
	        this.columnsCount = source["columnsCount"];
	        this.columnsColor = source["columnsColor"];
	        this.columnsMargin = source["columnsMargin"];
	        this.columnsGutter = source["columnsGutter"];
	        this.collageGap = source["collageGap"];
	        this.collageMargin = source["collageMargin"];
	        this.collageRadius = source["collageRadius"];
	        this.collageShowCutLines = source["collageShowCutLines"];
	        this.collageStrokeWidth = source["collageStrokeWidth"];
	        this.collageStrokeColor = source["collageStrokeColor"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}

}

