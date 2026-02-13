import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Rect, Text as FabricText, Group } from "fabric";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Move, Trash2, Download, Upload, Save, Home, Bath, DoorOpen, Cuboid, Presentation, UtensilsCrossed, Utensils, Box, LayoutGrid, Rows3 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";

interface LayoutDrawingToolProps {
  eventId?: string;
  initialLayout?: any;
  onSave?: (layoutJson: any) => Promise<void>;
  readOnly?: boolean;
}

type ToolType = "select" | "room" | "wall" | "restroom" | "table-row" | "table-pod" | "door" | "counter" | "stage" | "food" | "dining";
type TableSize = "6ft" | "8ft";

const WALL_THICKNESS = 3;
// Scale: 1ft = 8px
const FT = 8;

export const LayoutDrawingTool = ({ eventId, initialLayout, onSave, readOnly = false }: LayoutDrawingToolProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [tableSize, setTableSize] = useState<TableSize>("6ft");
  const [rowCount, setRowCount] = useState(5);
  const [saving, setSaving] = useState(false);

  const findMaxTableNumber = (objects: any[]): number => {
    let maxNum = 0;
    for (const obj of objects) {
      if (obj.type === 'text' && obj.text) {
        const match = obj.text.match(/^(\d+)$/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNum) maxNum = num;
        }
      }
      if (obj._objects) {
        const nested = findMaxTableNumber(obj._objects);
        if (nested > maxNum) maxNum = nested;
      }
    }
    return maxNum;
  };

  const getNextTableNumber = () => {
    if (!fabricCanvas) return 1;
    return findMaxTableNumber(fabricCanvas.getObjects()) + 1;
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 1000,
      height: 700,
      backgroundColor: "#ffffff",
    });

    canvas.on('selection:created', (e) => {
      const obj = e.selected?.[0] as any;
      if (obj && obj.objectType === 'room') canvas.sendObjectToBack(obj);
    });
    canvas.on('selection:updated', (e) => {
      const obj = e.selected?.[0] as any;
      if (obj && obj.objectType === 'room') canvas.sendObjectToBack(obj);
    });
    canvas.on('object:moving', (e) => {
      const obj = e.target as any;
      if (obj && obj.objectType === 'room') canvas.sendObjectToBack(obj);
    });
    canvas.on('object:modified', (e) => {
      const obj = e.target as any;
      if (obj && obj.objectType === 'room') canvas.sendObjectToBack(obj);
    });

    if (initialLayout) {
      canvas.loadFromJSON(initialLayout, () => {
        canvas.getObjects().forEach((obj: any) => {
          if (obj.objectType === 'room') canvas.sendObjectToBack(obj);
        });
        canvas.renderAll();
      });
    }

    if (readOnly) {
      canvas.selection = false;
      canvas.forEachObject((obj) => {
        obj.selectable = false;
        obj.evented = false;
      });
    }

    setFabricCanvas(canvas);
    toast.success("Layout tool ready!");

    return () => { canvas.dispose(); };
  }, [initialLayout, readOnly]);

  const createSingleTable = (tableNum: number, size: TableSize) => {
    const w = size === "6ft" ? 6 * FT : 8 * FT;
    const h = 30; // 30in ≈ 2.5ft depth

    const rect = new Rect({
      width: w,
      height: h,
      fill: "#fff3e0",
      stroke: "#f57c00",
      strokeWidth: 2,
      originX: 'center',
      originY: 'center',
    });

    const label = new FabricText(`${tableNum}`, {
      fontSize: 12,
      fontFamily: 'Arial',
      fill: '#333',
      originX: 'center',
      originY: 'center',
    });

    const sizeLabel = new FabricText(size, {
      fontSize: 8,
      fontFamily: 'Arial',
      fill: '#999',
      originX: 'center',
      originY: 'center',
      top: 10,
    });

    return new Group([rect, label, sizeLabel]);
  };

  const addTableRow = () => {
    if (!fabricCanvas) return;
    const startNum = getNextTableNumber();
    const w = tableSize === "6ft" ? 6 * FT : 8 * FT;
    const gap = 4;
    const tables: Group[] = [];

    for (let i = 0; i < rowCount; i++) {
      const table = createSingleTable(startNum + i, tableSize);
      table.set({ left: i * (w + gap), top: 0 });
      tables.push(table);
    }

    const rowGroup = new Group(tables, {
      left: 100,
      top: 100,
    });
    (rowGroup as any).objectType = 'table-row';
    fabricCanvas.add(rowGroup);
    fabricCanvas.setActiveObject(rowGroup);
    fabricCanvas.renderAll();
  };

  const getNextPodLetter = () => {
    if (!fabricCanvas) return 'A';
    let maxCode = 64; // '@' = one before 'A'
    const findPodLabels = (objects: any[]) => {
      for (const obj of objects) {
        if (obj.type === 'text' && obj.text && /^Pod [A-Z]$/.test(obj.text)) {
          const code = obj.text.charCodeAt(4);
          if (code > maxCode) maxCode = code;
        }
        if (obj._objects) findPodLabels(obj._objects);
      }
    };
    findPodLabels(fabricCanvas.getObjects());
    return String.fromCharCode(maxCode + 1);
  };

  const addTablePod = () => {
    if (!fabricCanvas) return;
    const startNum = getNextTableNumber();
    const w = tableSize === "6ft" ? 6 * FT : 8 * FT;
    const h = 30;
    const gap = 4;
    const podLetter = getNextPodLetter();
    const items: any[] = [];

    // Square pod: 3 top, 3 bottom, 4 corners rotated 90°
    const topRowWidth = 3 * (w + gap) - gap;
    const cornerW = h; // rotated: width becomes the table depth
    const innerPadding = 8;
    const podWidth = cornerW + innerPadding + topRowWidth + innerPadding + cornerW;
    const podHeight = w + innerPadding * 2; // corner tables (rotated) define height

    // Top row: 3 tables (numbered 1-3)
    const topRowLeft = cornerW + innerPadding;
    for (let i = 0; i < 3; i++) {
      const table = createSingleTable(startNum + i, tableSize);
      table.set({ left: topRowLeft + i * (w + gap), top: 0 });
      items.push(table);
    }

    // Bottom row: 3 tables (numbered 4-6)
    const bottomY = podHeight - h;
    for (let i = 0; i < 3; i++) {
      const table = createSingleTable(startNum + 3 + i, tableSize);
      table.set({ left: topRowLeft + i * (w + gap), top: bottomY });
      items.push(table);
    }

    // Corner tables rotated 90° (numbered 7-10)
    const corners = [
      { left: cornerW, top: 0 },                          // top-left
      { left: podWidth, top: 0 },                          // top-right
      { left: cornerW, top: podHeight },                   // bottom-left
      { left: podWidth, top: podHeight },                  // bottom-right
    ];
    for (let i = 0; i < 4; i++) {
      const table = createSingleTable(startNum + 6 + i, tableSize);
      table.set({ left: corners[i].left, top: corners[i].top, angle: 90 });
      items.push(table);
    }

    // Dashed outline
    const outline = new Rect({
      left: -6,
      top: -6,
      width: podWidth + 12,
      height: podHeight + 12,
      fill: 'transparent',
      stroke: '#bdbdbd',
      strokeWidth: 1,
      strokeDashArray: [4, 4],
    });
    items.unshift(outline);

    // Editable pod letter label in center
    const podLabel = new FabricText(`Pod ${podLetter}`, {
      fontSize: 16,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: '#1976d2',
      left: podWidth / 2,
      top: podHeight / 2,
      originX: 'center',
      originY: 'center',
    });
    items.push(podLabel);

    const podGroup = new Group(items, {
      left: 100,
      top: 100,
      subTargetCheck: true,
    });
    (podGroup as any).objectType = 'table-pod';

    // Double-click to edit pod label
    podGroup.on('mousedblclick', () => {
      const newLabel = prompt('Enter pod label:', podLetter);
      if (newLabel !== null && newLabel.trim()) {
        podLabel.set({ text: `Pod ${newLabel.trim().toUpperCase()}` });
        fabricCanvas.renderAll();
      }
    });

    fabricCanvas.add(podGroup);
    fabricCanvas.setActiveObject(podGroup);
    fabricCanvas.renderAll();
  };

  const createLabeledObject = (rect: Rect, label: string) => {
    const text = new FabricText(label, {
      fontSize: 14,
      fontFamily: 'Arial',
      fill: '#000000',
      originX: 'center',
      originY: 'center',
    });
    return new Group([rect, text], { left: 100, top: 100 });
  };

  const handleToolClick = (tool: ToolType) => {
    setActiveTool(tool);
    if (!fabricCanvas) return;

    if (tool === "table-row") {
      addTableRow();
      return;
    }
    if (tool === "table-pod") {
      addTablePod();
      return;
    }

    if (tool === "room") {
      const rect = new Rect({ left: 100, top: 100, width: 200, height: 150, fill: "#e3f2fd", stroke: "#1976d2", strokeWidth: WALL_THICKNESS });
      rect.set({ objectType: 'room' } as any);
      fabricCanvas.add(rect);
      fabricCanvas.sendObjectToBack(rect);
      fabricCanvas.setActiveObject(rect);
    } else if (tool === "wall") {
      const rect = new Rect({ left: 100, top: 100, width: 200, height: WALL_THICKNESS, fill: "#424242", stroke: "#424242", strokeWidth: 0 });
      rect.set({ objectType: 'wall' } as any);
      fabricCanvas.add(rect);
      fabricCanvas.setActiveObject(rect);
    } else if (tool === "restroom") {
      const rect = new Rect({ width: 80, height: 80, fill: "#f3e5f5", stroke: "#7b1fa2", strokeWidth: WALL_THICKNESS, originX: 'center', originY: 'center' });
      const group = createLabeledObject(rect, "Restroom");
      fabricCanvas.add(group);
      fabricCanvas.setActiveObject(group);
    } else if (tool === "door") {
      const rect = new Rect({ width: 80, height: 20, fill: "#e8f5e9", stroke: "#388e3c", strokeWidth: WALL_THICKNESS, originX: 'center', originY: 'center' });
      const group = createLabeledObject(rect, "Door");
      fabricCanvas.add(group);
      fabricCanvas.setActiveObject(group);
    } else if (tool === "counter") {
      const rect = new Rect({ width: 150, height: 60, fill: "#fce4ec", stroke: "#c2185b", strokeWidth: WALL_THICKNESS, originX: 'center', originY: 'center' });
      const group = createLabeledObject(rect, "Counter");
      fabricCanvas.add(group);
      fabricCanvas.setActiveObject(group);
    } else if (tool === "stage") {
      const rect = new Rect({ width: 250, height: 100, fill: "#ede7f6", stroke: "#512da8", strokeWidth: WALL_THICKNESS, originX: 'center', originY: 'center' });
      const group = createLabeledObject(rect, "Stage");
      fabricCanvas.add(group);
      fabricCanvas.setActiveObject(group);
    } else if (tool === "food") {
      const rect = new Rect({ width: 120, height: 100, fill: "#fff9c4", stroke: "#f57f17", strokeWidth: WALL_THICKNESS, originX: 'center', originY: 'center' });
      const group = createLabeledObject(rect, "Food");
      fabricCanvas.add(group);
      fabricCanvas.setActiveObject(group);
    } else if (tool === "dining") {
      const rect = new Rect({ width: 180, height: 120, fill: "#e0f2f1", stroke: "#00897b", strokeWidth: WALL_THICKNESS, originX: 'center', originY: 'center' });
      const group = createLabeledObject(rect, "Dining");
      fabricCanvas.add(group);
      fabricCanvas.setActiveObject(group);
    }
  };

  const handleClear = () => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#ffffff";
    fabricCanvas.renderAll();
    toast.success("Canvas cleared!");
  };

  const handleDownload = () => {
    if (!fabricCanvas) return;
    const dataURL = fabricCanvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
    const link = document.createElement('a');
    link.download = `layout-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
    toast.success("Layout downloaded!");
  };

  const handleSaveJSON = () => {
    if (!fabricCanvas) return;
    const json = JSON.stringify(fabricCanvas.toJSON());
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `layout-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Layout saved!");
  };

  const handleLoadJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !fabricCanvas) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const json = event.target?.result as string;
        fabricCanvas.loadFromJSON(JSON.parse(json), () => {
          fabricCanvas.renderAll();
          toast.success("Layout loaded!");
        });
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleSaveToEvent = async () => {
    if (!fabricCanvas || !onSave) return;
    setSaving(true);
    try {
      const json = fabricCanvas.toJSON();
      await onSave(json);
      toast.success("Layout saved to event!");
    } catch (error) {
      console.error("Error saving layout:", error);
      toast.error("Failed to save layout");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <>
          {/* Table configuration bar */}
          <Card className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium whitespace-nowrap">Table Size:</Label>
                <Select value={tableSize} onValueChange={(v) => setTableSize(v as TableSize)}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6ft">6 ft</SelectItem>
                    <SelectItem value="8ft">8 ft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium whitespace-nowrap">Row Count:</Label>
                <Select value={String(rowCount)} onValueChange={(v) => setRowCount(Number(v))}>
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-l border-border h-8 mx-1" />

              <Button
                variant={activeTool === "table-row" ? "default" : "outline"}
                size="sm"
                onClick={() => handleToolClick("table-row")}
              >
                <Rows3 className="h-4 w-4 mr-2" />
                Add Row
              </Button>
              <Button
                variant={activeTool === "table-pod" ? "default" : "outline"}
                size="sm"
                onClick={() => handleToolClick("table-pod")}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Add Pod (10)
              </Button>
            </div>
          </Card>

          {/* Tools bar */}
          <Card className="p-4">
            <div className="flex gap-2 flex-wrap">
              <Button variant={activeTool === "select" ? "default" : "outline"} size="sm" onClick={() => handleToolClick("select")}>
                <Move className="h-4 w-4 mr-2" />Select
              </Button>
              <Button variant={activeTool === "room" ? "default" : "outline"} size="sm" onClick={() => handleToolClick("room")} title="Room">
                <Home className="h-4 w-4" />
              </Button>
              <Button variant={activeTool === "wall" ? "default" : "outline"} size="sm" onClick={() => handleToolClick("wall")}>
                <Box className="h-4 w-4 mr-2" />Wall
              </Button>
              <Button variant={activeTool === "restroom" ? "default" : "outline"} size="sm" onClick={() => handleToolClick("restroom")}>
                <Bath className="h-4 w-4 mr-2" />Restroom
              </Button>
              <Button variant={activeTool === "door" ? "default" : "outline"} size="sm" onClick={() => handleToolClick("door")}>
                <DoorOpen className="h-4 w-4 mr-2" />Door
              </Button>
              <Button variant={activeTool === "counter" ? "default" : "outline"} size="sm" onClick={() => handleToolClick("counter")}>
                <Cuboid className="h-4 w-4 mr-2" />Counter
              </Button>
              <Button variant={activeTool === "stage" ? "default" : "outline"} size="sm" onClick={() => handleToolClick("stage")}>
                <Presentation className="h-4 w-4 mr-2" />Stage
              </Button>
              <Button variant={activeTool === "food" ? "default" : "outline"} size="sm" onClick={() => handleToolClick("food")}>
                <UtensilsCrossed className="h-4 w-4 mr-2" />Food
              </Button>
              <Button variant={activeTool === "dining" ? "default" : "outline"} size="sm" onClick={() => handleToolClick("dining")}>
                <Utensils className="h-4 w-4 mr-2" />Dining
              </Button>

              <div className="border-l border-border mx-2" />

              <Button variant="outline" size="sm" onClick={handleClear}>
                <Trash2 className="h-4 w-4 mr-2" />Clear
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />Download PNG
              </Button>
              <Button variant="outline" size="sm" onClick={handleSaveJSON}>
                <Download className="h-4 w-4 mr-2" />Save
              </Button>
              <Button variant="outline" size="sm" onClick={handleLoadJSON}>
                <Upload className="h-4 w-4 mr-2" />Load
              </Button>

              {eventId && onSave && (
                <>
                  <div className="border-l border-border mx-2" />
                  <Button variant="default" size="sm" onClick={handleSaveToEvent} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Save to Event"}
                  </Button>
                </>
              )}
            </div>
          </Card>
        </>
      )}

      <div className={readOnly ? "" : "p-4"}>
        <div className="border border-border rounded-lg overflow-hidden bg-white">
          <canvas ref={canvasRef} />
        </div>
      </div>

      {!readOnly && (
        <Card className="p-4">
          <div className="flex gap-6 text-xs text-muted-foreground">
            <div><span className="font-medium">Pod:</span> Square layout — 3 top, 3 bottom, 4 corners rotated (10 tables). Double-click to rename.</div>
            <div><span className="font-medium">Row:</span> Single line of tables, configurable count</div>
            <div><span className="font-medium">6ft table:</span> 6' × 30"</div>
            <div><span className="font-medium">8ft table:</span> 8' × 30"</div>
          </div>
        </Card>
      )}
    </div>
  );
};
