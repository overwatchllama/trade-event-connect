import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Rect, Text as FabricText, Group, Line } from "fabric";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Move, Trash2, Download, Upload, Save, Home, Bath, DoorOpen, Cuboid, Presentation, UtensilsCrossed, Utensils, Box, LayoutGrid, Rows3, Square, XSquare, TableProperties, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";

interface EventData {
  title?: string;
  date?: string;
  venue?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  total_tables?: number | null;
  vendor_start_time?: string | null;
  vendor_table_price?: number | null;
}

interface LayoutDrawingToolProps {
  eventId?: string;
  initialLayout?: any;
  onSave?: (layoutJson: any) => Promise<void>;
  readOnly?: boolean;
  eventData?: EventData;
}

type ToolType = "select" | "room" | "wall" | "restroom" | "table-single" | "table-row" | "table-pod" | "door" | "counter" | "stage" | "food" | "dining" | "void";
type TableSize = "6ft" | "8ft";

const WALL_THICKNESS = 3;
// Scale: 1ft = 8px
const FT = 8;

export const LayoutDrawingTool = ({ eventId, initialLayout, onSave, readOnly = false, eventData }: LayoutDrawingToolProps) => {
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
      snapAngle: 45,
      snapThreshold: 10,
    });

    const reorderLayers = () => {
      const objects = canvas.getObjects();
      const rooms = objects.filter((o: any) => o.objectType === 'room');
      const walls = objects.filter((o: any) => o.objectType === 'wall');
      rooms.forEach((o) => canvas.sendObjectToBack(o));
      walls.forEach((o) => {
        canvas.sendObjectToBack(o);
        // Move walls above rooms
        rooms.forEach(() => canvas.bringObjectForward(o));
      });
    };

    canvas.on('selection:created', reorderLayers);
    canvas.on('selection:updated', reorderLayers);
    canvas.on('object:moving', reorderLayers);
    canvas.on('object:modified', reorderLayers);
    canvas.on('object:added', reorderLayers);

    // Keep text right-side-up after rotation (except doors)
    canvas.on('object:rotating', (e) => {
      const obj = e.target as any;
      if (!obj || !obj._objects) return;
      // Check if it's a door - skip counter-rotation for doors
      const isDoor = obj._objects.some((child: any) => child.type === 'text' && child.text === 'Door');
      if (isDoor) return;
      const angle = obj.angle || 0;
      obj._objects.forEach((child: any) => {
        if (child.type === 'text') {
          child.set({ angle: -angle });
        }
      });
    });
    canvas.on('object:modified', (e) => {
      const obj = e.target as any;
      if (!obj || !obj._objects) return;
      const isDoor = obj._objects.some((child: any) => child.type === 'text' && child.text === 'Door');
      if (isDoor) return;
      const angle = obj.angle || 0;
      obj._objects.forEach((child: any) => {
        if (child.type === 'text') {
          child.set({ angle: -angle });
        }
      });
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
    const h = 2.5 * FT; // 30 inches = 2.5ft

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
    const h = 2.5 * FT; // 30 inches table depth
    const gap = 4;
    const podLetter = getNextPodLetter();
    const items: any[] = [];

    // Square pod: tables on all 4 sides
    const innerPadding = 8;
    // Top/bottom rows: 3 tables horizontal
    const topRowWidth = 3 * (w + gap) - gap;
    // Side columns use rotated tables, so their "width" along the side = h
    const sideSize = h; // depth of rotated side tables
    const podSize = sideSize + innerPadding + topRowWidth + innerPadding + sideSize;

    // How many side tables fit vertically (rotated, so their length = w goes vertical)
    const sideAvailableHeight = podSize - 2 * (h + innerPadding); // space between top/bottom row depths
    const sideTableCount = Math.max(1, Math.floor((sideAvailableHeight + gap) / (w + gap)));
    const sideTableStartY = h + innerPadding;

    // Top row: 3 tables
    const topRowLeft = sideSize + innerPadding;
    for (let i = 0; i < 3; i++) {
      const table = createSingleTable(startNum + i, tableSize);
      table.set({ left: topRowLeft + i * (w + gap), top: 0 });
      items.push(table);
    }

    // Bottom row: 3 tables
    const bottomY = podSize - h;
    for (let i = 0; i < 3; i++) {
      const table = createSingleTable(startNum + 3 + i, tableSize);
      table.set({ left: topRowLeft + i * (w + gap), top: bottomY });
      items.push(table);
    }

    // Left side tables (rotated 90°)
    let tableIndex = 6;
    for (let i = 0; i < sideTableCount; i++) {
      const table = createSingleTable(startNum + tableIndex, tableSize);
      table.set({ left: sideSize, top: sideTableStartY + i * (w + gap), angle: 90 });
      items.push(table);
      tableIndex++;
    }

    // Right side tables (rotated 90°)
    for (let i = 0; i < sideTableCount; i++) {
      const table = createSingleTable(startNum + tableIndex, tableSize);
      table.set({ left: podSize, top: sideTableStartY + i * (w + gap), angle: 90 });
      items.push(table);
      tableIndex++;
    }

    // Dashed outline
    const outline = new Rect({
      left: -6,
      top: -6,
      width: podSize + 12,
      height: podSize + 12,
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
      left: podSize / 2,
      top: podSize / 2,
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

  const createInfoBlock = (lines: string[], borderColor: string) => {
    if (!fabricCanvas) return;
    const padding = 12;
    const lineHeight = 16;
    const textObjects = lines.map((line, i) => {
      const isBold = i === 0;
      return new FabricText(line, {
        fontSize: isBold ? 13 : 11,
        fontFamily: 'Arial',
        fontWeight: isBold ? 'bold' : 'normal',
        fill: '#333333',
        left: padding,
        top: padding + i * lineHeight,
      });
    });
    const maxWidth = Math.max(...textObjects.map(t => t.width || 80));
    const boxWidth = maxWidth + padding * 2;
    const boxHeight = padding * 2 + lines.length * lineHeight;
    const bg = new Rect({
      width: boxWidth,
      height: boxHeight,
      fill: '#ffffff',
      stroke: borderColor,
      strokeWidth: 2,
      strokeUniform: true,
      rx: 4,
      ry: 4,
    });
    const group = new Group([bg, ...textObjects], { left: 50, top: 50 });
    (group as any).objectType = 'info-block';
    fabricCanvas.add(group);
    fabricCanvas.setActiveObject(group);
    fabricCanvas.renderAll();
  };

  const addTableInfoBlock = () => {
    if (!eventData) { toast.error("No event data available"); return; }
    const lines = [
      "Vendor / Exhibit Tables",
      `Total Tables: ${eventData.total_tables ?? "N/A"}`,
      `Table Size: ${tableSize}`,
    ];
    createInfoBlock(lines, '#f57c00');
  };

  const addDateTimeBlock = () => {
    if (!eventData) { toast.error("No event data available"); return; }
    const lines = [
      "Show Date & Time",
      `Date: ${eventData.date || "TBD"}`,
    ];
    if (eventData.vendor_start_time) {
      lines.push(`Vendor Start: ${eventData.vendor_start_time}`);
    }
    createInfoBlock(lines, '#1976d2');
  };

  const addLocationBlock = () => {
    if (!eventData) { toast.error("No event data available"); return; }
    const lines = [
      "Location",
      eventData.venue || "TBD",
    ];
    if (eventData.address) lines.push(eventData.address);
    const cityLine = [eventData.city, eventData.state, eventData.zip_code].filter(Boolean).join(', ');
    if (cityLine) lines.push(cityLine);
    createInfoBlock(lines, '#388e3c');
  };

  const addSingleTable = () => {
    if (!fabricCanvas) return;
    const tableNum = getNextTableNumber();
    const table = createSingleTable(tableNum, tableSize);
    table.set({ left: 100, top: 100 });
    (table as any).objectType = 'table';
    fabricCanvas.add(table);
    fabricCanvas.setActiveObject(table);
    fabricCanvas.renderAll();
  };

  const handleToolClick = (tool: ToolType) => {
    setActiveTool(tool);
    if (!fabricCanvas) return;

    if (tool === "table-single") {
      addSingleTable();
      return;
    }
    if (tool === "table-row") {
      addTableRow();
      return;
    }
    if (tool === "table-pod") {
      addTablePod();
      return;
    }

    if (tool === "room") {
      const rect = new Rect({ left: 100, top: 100, width: 200, height: 150, fill: "#e3f2fd", stroke: "#000000", strokeWidth: WALL_THICKNESS, strokeUniform: true });
      rect.set({ objectType: 'room' } as any);
      fabricCanvas.add(rect);
      fabricCanvas.setActiveObject(rect);
    } else if (tool === "wall") {
      const rect = new Rect({ left: 100, top: 100, width: 200, height: WALL_THICKNESS, fill: "#000000", stroke: "#000000", strokeWidth: WALL_THICKNESS, strokeUniform: true });
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
    } else if (tool === "void") {
      const size = 100;
      const rect = new Rect({ width: size, height: size, fill: "#f5f5f5", stroke: "#666666", strokeWidth: WALL_THICKNESS, strokeUniform: true, originX: 'center', originY: 'center' });
      const line1 = new Line([-size / 2, -size / 2, size / 2, size / 2], { stroke: '#666666', strokeWidth: 2, originX: 'center', originY: 'center' });
      const line2 = new Line([size / 2, -size / 2, -size / 2, size / 2], { stroke: '#666666', strokeWidth: 2, originX: 'center', originY: 'center' });
      const label = new FabricText("Void", { fontSize: 14, fontFamily: 'Arial', fill: '#666666', originX: 'center', originY: 'center' });
      const group = new Group([rect, line1, line2, label], { left: 100, top: 100 });
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
                variant={activeTool === "table-single" ? "default" : "outline"}
                size="sm"
                onClick={() => handleToolClick("table-single")}
              >
                <Square className="h-4 w-4 mr-2" />
                Add Table
              </Button>
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
                Add Pod
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
              <Button variant={activeTool === "void" ? "default" : "outline"} size="sm" onClick={() => handleToolClick("void")}>
                <XSquare className="h-4 w-4 mr-2" />Void
              </Button>

              {eventData && (
                <>
                  <div className="border-l border-border mx-2" />
                  <Button variant="outline" size="sm" onClick={addTableInfoBlock}>
                    <TableProperties className="h-4 w-4 mr-2" />Tables Info
                  </Button>
                  <Button variant="outline" size="sm" onClick={addDateTimeBlock}>
                    <Clock className="h-4 w-4 mr-2" />Date/Time
                  </Button>
                  <Button variant="outline" size="sm" onClick={addLocationBlock}>
                    <MapPin className="h-4 w-4 mr-2" />Location
                  </Button>
                </>
              )}

              <div className="border-l border-border mx-2" />

              <Button variant="destructive" size="sm" onClick={() => {
                if (!fabricCanvas) return;
                const active = fabricCanvas.getActiveObjects();
                if (active.length === 0) { toast.error("No objects selected"); return; }
                active.forEach((obj) => fabricCanvas.remove(obj));
                fabricCanvas.discardActiveObject();
                fabricCanvas.renderAll();
                toast.success(`Deleted ${active.length} object(s)`);
              }}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </Button>
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
