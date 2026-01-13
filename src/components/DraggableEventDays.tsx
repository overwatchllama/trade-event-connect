import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, GripVertical } from 'lucide-react';

interface EventDay {
  date: string;
  startTime: string;
  endTime: string;
  dayNumber: number;
  ticketCost: string;
}

interface DraggableEventDaysProps {
  eventDays: EventDay[];
  setEventDays: React.Dispatch<React.SetStateAction<EventDay[]>>;
  isMultiDay: boolean;
}

const DraggableEventDays = ({ eventDays, setEventDays, isMultiDay }: DraggableEventDaysProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);

  const addEventDay = () => {
    setEventDays(prev => [...prev, { 
      date: '', 
      startTime: '', 
      endTime: '', 
      dayNumber: prev.length + 1,
      ticketCost: ''
    }]);
  };

  const removeEventDay = (index: number) => {
    if (eventDays.length > 1) {
      setEventDays(prev => {
        const updated = prev.filter((_, i) => i !== index);
        // Renumber days after removal
        return updated.map((day, i) => ({ ...day, dayNumber: i + 1 }));
      });
    }
  };

  const updateEventDay = (index: number, field: string, value: string) => {
    setEventDays(prev => prev.map((day, i) => 
      i === index ? { ...day, [field]: value } : day
    ));
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    dragNode.current = e.currentTarget;
    e.currentTarget.classList.add('opacity-50');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50');
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
    dragNode.current = null;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex !== null && draggedIndex !== index) {
      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? 'before' : 'after';
      setDragOverIndex(index);
      setDropPosition(position);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
    setDropPosition(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDragOverIndex(null);
      setDropPosition(null);
      return;
    }

    setEventDays(prev => {
      const updated = [...prev];
      const [draggedItem] = updated.splice(draggedIndex, 1);
      // Adjust drop index based on position and whether we're moving up or down
      let adjustedIndex = dropIndex;
      if (dropPosition === 'after') {
        adjustedIndex = draggedIndex < dropIndex ? dropIndex : dropIndex + 1;
      } else {
        adjustedIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
      }
      updated.splice(adjustedIndex, 0, draggedItem);
      // Renumber days after reorder
      return updated.map((day, i) => ({ ...day, dayNumber: i + 1 }));
    });

    setDragOverIndex(null);
    setDropPosition(null);
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Event Schedule</Label>
        {isMultiDay && (
          <Button type="button" variant="outline" size="sm" onClick={addEventDay}>
            <Plus className="w-4 h-4 mr-1" /> Add Day
          </Button>
        )}
      </div>
      
      <div className="space-y-2 relative">
        {eventDays.map((day, index) => (
          <div key={`wrapper-${index}`} className="relative">
            {/* Drop indicator line - before */}
            {dragOverIndex === index && dropPosition === 'before' && draggedIndex !== index && (
              <div className="absolute -top-1 left-0 right-0 z-10 flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-primary border-2 border-primary shadow-lg" />
                <div className="flex-1 h-0.5 bg-primary rounded-full shadow-lg" />
                <div className="w-3 h-3 rounded-full bg-primary border-2 border-primary shadow-lg" />
              </div>
            )}
            <div
              draggable={isMultiDay && eventDays.length > 1}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              className={`p-3 border rounded-lg space-y-2 bg-background
                transition-all duration-300 ease-out
                ${draggedIndex === index 
                  ? 'opacity-60 scale-95 shadow-xl rotate-1 cursor-grabbing border-muted' 
                  : 'border-border'
                }
                ${draggedIndex !== null && draggedIndex !== index
                  ? 'opacity-90'
                  : ''
                }
                ${isMultiDay && eventDays.length > 1 ? 'hover:shadow-md hover:border-primary/50' : ''}
              `}
              style={{
                transform: draggedIndex === index 
                  ? 'scale(0.95) rotate(1deg)' 
                  : 'translateY(0) scale(1)',
              }}
            >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isMultiDay && eventDays.length > 1 && (
                  <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                    <GripVertical className="w-4 h-4" />
                  </div>
                )}
                <h4 className="font-medium text-sm">{isMultiDay ? `Day ${index + 1}` : 'Event Day'}</h4>
              </div>
              {isMultiDay && eventDays.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeEventDay(index)}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input 
                  type="date" 
                  value={day.date} 
                  onChange={(e) => updateEventDay(index, 'date', e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Start Time</Label>
                <Input 
                  type="time" 
                  value={day.startTime} 
                  onChange={(e) => updateEventDay(index, 'startTime', e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End Time</Label>
                <Input 
                  type="time" 
                  value={day.endTime} 
                  onChange={(e) => updateEventDay(index, 'endTime', e.target.value)} 
                  required 
                />
              </div>
            </div>
            {isMultiDay && (
              <div className="space-y-1">
                <Label className="text-xs">Day Ticket Cost ($)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  placeholder="0.00" 
                  value={day.ticketCost} 
                  onChange={(e) => updateEventDay(index, 'ticketCost', e.target.value)} 
                />
              </div>
              )}
            </div>
            
            {/* Drop indicator line - after */}
            {dragOverIndex === index && dropPosition === 'after' && draggedIndex !== index && (
              <div className="absolute -bottom-1 left-0 right-0 z-10 flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-primary border-2 border-primary shadow-lg" />
                <div className="flex-1 h-0.5 bg-primary rounded-full shadow-lg" />
                <div className="w-3 h-3 rounded-full bg-primary border-2 border-primary shadow-lg" />
              </div>
            )}
          </div>
        ))}
      </div>
      
      {isMultiDay && eventDays.length > 1 && (
        <p className="text-xs text-muted-foreground">
          Drag and drop to reorder days
        </p>
      )}
    </div>
  );
};

export default DraggableEventDays;
