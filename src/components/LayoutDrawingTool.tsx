import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Circle, Rect, Line, PencilBrush } from "fabric";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Pencil, Square, Circle as CircleIcon, Move, Trash2, Download, Upload } from "lucide-react";
import { toast } from "sonner";

export const LayoutDrawingTool = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<"select" | "draw" | "rectangle" | "circle">("select");

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 1000,
      height: 700,
      backgroundColor: "#ffffff",
    });

    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = "#000000";
    canvas.freeDrawingBrush.width = 2;

    setFabricCanvas(canvas);
    toast.success("Layout tool ready!");

    return () => {
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === "draw";
    
    if (activeTool === "draw" && fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = "#000000";
      fabricCanvas.freeDrawingBrush.width = 2;
    }
  }, [activeTool, fabricCanvas]);

  const handleToolClick = (tool: typeof activeTool) => {
    setActiveTool(tool);

    if (tool === "rectangle") {
      const rect = new Rect({
        left: 100,
        top: 100,
        fill: "transparent",
        stroke: "#000000",
        strokeWidth: 2,
        width: 150,
        height: 100,
      });
      fabricCanvas?.add(rect);
      fabricCanvas?.setActiveObject(rect);
    } else if (tool === "circle") {
      const circle = new Circle({
        left: 100,
        top: 100,
        fill: "transparent",
        stroke: "#000000",
        strokeWidth: 2,
        radius: 50,
      });
      fabricCanvas?.add(circle);
      fabricCanvas?.setActiveObject(circle);
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

  return (
    <div className="space-y-4">
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
            variant={activeTool === "draw" ? "default" : "outline"}
            size="sm"
            onClick={() => handleToolClick("draw")}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Draw
          </Button>
          <Button
            variant={activeTool === "rectangle" ? "default" : "outline"}
            size="sm"
            onClick={() => handleToolClick("rectangle")}
          >
            <Square className="h-4 w-4 mr-2" />
            Rectangle
          </Button>
          <Button
            variant={activeTool === "circle" ? "default" : "outline"}
            size="sm"
            onClick={() => handleToolClick("circle")}
          >
            <CircleIcon className="h-4 w-4 mr-2" />
            Circle
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
        </div>
      </Card>

      <Card className="p-4">
        <div className="border border-border rounded-lg overflow-hidden bg-white">
          <canvas ref={canvasRef} />
        </div>
      </Card>
    </div>
  );
};
