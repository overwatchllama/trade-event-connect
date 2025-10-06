import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Rect, Text as FabricText, Group } from "fabric";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Move, Trash2, Download, Upload, Save, Home, Bath, Table, DoorOpen, Cuboid } from "lucide-react";
import { toast } from "sonner";

interface LayoutDrawingToolProps {
  eventId?: string;
  initialLayout?: any;
  onSave?: (layoutJson: any) => Promise<void>;
  readOnly?: boolean;
}

export const LayoutDrawingTool = ({ eventId, initialLayout, onSave, readOnly = false }: LayoutDrawingToolProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<"select" | "room" | "restroom" | "table" | "door" | "counter">("select");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 1000,
      height: 700,
      backgroundColor: "#ffffff",
    });

    // Load initial layout if provided
    if (initialLayout) {
      canvas.loadFromJSON(initialLayout, () => {
        canvas.renderAll();
      });
    }

    // Make canvas read-only if specified
    if (readOnly) {
      canvas.selection = false;
      canvas.forEachObject((obj) => {
        obj.selectable = false;
        obj.evented = false;
      });
    }

    setFabricCanvas(canvas);
    toast.success("Layout tool ready!");

    return () => {
      canvas.dispose();
    };
  }, [initialLayout, readOnly]);

  const createLabeledObject = (rect: Rect, label: string) => {
    const text = new FabricText(label, {
      fontSize: 14,
      fontFamily: 'Arial',
      fill: '#000000',
      originX: 'center',
      originY: 'center',
    });

    const group = new Group([rect, text], {
      left: 100,
      top: 100,
    });

    return group;
  };

  const handleToolClick = (tool: typeof activeTool) => {
    setActiveTool(tool);

    if (!fabricCanvas) return;

    if (tool === "room") {
      const rect = new Rect({
        width: 200,
        height: 150,
        fill: "#e3f2fd",
        stroke: "#1976d2",
        strokeWidth: 3,
        originX: 'center',
        originY: 'center',
      });
      const group = createLabeledObject(rect, "Room");
      fabricCanvas.add(group);
      fabricCanvas.setActiveObject(group);
    } else if (tool === "restroom") {
      const rect = new Rect({
        width: 80,
        height: 80,
        fill: "#f3e5f5",
        stroke: "#7b1fa2",
        strokeWidth: 3,
        originX: 'center',
        originY: 'center',
      });
      const group = createLabeledObject(rect, "Restroom");
      fabricCanvas.add(group);
      fabricCanvas.setActiveObject(group);
    } else if (tool === "table") {
      const rect = new Rect({
        width: 60,
        height: 60,
        fill: "#fff3e0",
        stroke: "#f57c00",
        strokeWidth: 2,
        originX: 'center',
        originY: 'center',
      });
      const group = createLabeledObject(rect, "Table");
      fabricCanvas.add(group);
      fabricCanvas.setActiveObject(group);
    } else if (tool === "door") {
      const rect = new Rect({
        width: 80,
        height: 20,
        fill: "#e8f5e9",
        stroke: "#388e3c",
        strokeWidth: 3,
        originX: 'center',
        originY: 'center',
      });
      const group = createLabeledObject(rect, "Door");
      fabricCanvas.add(group);
      fabricCanvas.setActiveObject(group);
    } else if (tool === "counter") {
      const rect = new Rect({
        width: 150,
        height: 60,
        fill: "#fce4ec",
        stroke: "#c2185b",
        strokeWidth: 2,
        originX: 'center',
        originY: 'center',
      });
      const group = createLabeledObject(rect, "Counter");
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
    
    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1,
    });
    
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
        <Card className="p-4">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={activeTool === "select" ? "default" : "outline"}
              size="sm"
              onClick={() => handleToolClick("select")}
            >
              <Move className="h-4 w-4 mr-2" />
              Select
            </Button>
            <Button
              variant={activeTool === "room" ? "default" : "outline"}
              size="sm"
              onClick={() => handleToolClick("room")}
            >
              <Home className="h-4 w-4 mr-2" />
              Room
            </Button>
            <Button
              variant={activeTool === "restroom" ? "default" : "outline"}
              size="sm"
              onClick={() => handleToolClick("restroom")}
            >
              <Bath className="h-4 w-4 mr-2" />
              Restroom
            </Button>
            <Button
              variant={activeTool === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => handleToolClick("table")}
            >
              <Table className="h-4 w-4 mr-2" />
              Table
            </Button>
            <Button
              variant={activeTool === "door" ? "default" : "outline"}
              size="sm"
              onClick={() => handleToolClick("door")}
            >
              <DoorOpen className="h-4 w-4 mr-2" />
              Door
            </Button>
            <Button
              variant={activeTool === "counter" ? "default" : "outline"}
              size="sm"
              onClick={() => handleToolClick("counter")}
            >
              <Cuboid className="h-4 w-4 mr-2" />
              Counter
            </Button>
            
            <div className="border-l border-border mx-2" />
            
            <Button variant="outline" size="sm" onClick={handleClear}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download PNG
            </Button>
            <Button variant="outline" size="sm" onClick={handleSaveJSON}>
              <Download className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={handleLoadJSON}>
              <Upload className="h-4 w-4 mr-2" />
              Load
            </Button>
            
            {eventId && onSave && (
              <>
                <div className="border-l border-border mx-2" />
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleSaveToEvent}
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save to Event"}
                </Button>
              </>
            )}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="border border-border rounded-lg overflow-hidden bg-white">
          <canvas ref={canvasRef} />
        </div>
      </Card>
    </div>
  );
};
