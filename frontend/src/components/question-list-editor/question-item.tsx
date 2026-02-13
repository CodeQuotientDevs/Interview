import { ChevronDown, GripVertical, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface QuestionItemProps {
  id: string; // Required for dnd-kit
  index: number;
  question: string;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
  onRemove: () => void;
}

export function QuestionItem({ id, index, question, isExpanded, onToggle, onChange, onRemove }: QuestionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
  };

  const lineCount = question.split('\n').filter(line => line.trim()).length;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg border border-border bg-card transition-all duration-200",
        isExpanded ? "ring-1 ring-primary/20 shadow-sm" : "hover:border-primary/30",
        isDragging && "opacity-50 border-primary/50 ring-1 ring-primary/30 shadow-lg cursor-grabbing"
      )}
    >
      {/* Header - Always visible */}
      <div 
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={onToggle}
      >
        <div 
          className="flex items-center gap-2 text-muted-foreground mr-1"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing" />
          <span className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded font-bold">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>
        
        <div className="flex-1 min-w-0">
          {isExpanded ? (
            <span className="text-sm font-semibold text-foreground">Question {index + 1}</span>
          ) : (
            <p className="text-sm text-foreground truncate pr-4">
              {question || <span className="text-muted-foreground/60 italic">No question content...</span>}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isExpanded && lineCount > 1 && (
            <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {lineCount} lines
            </span>
          )}
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <ChevronDown 
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isExpanded && "rotate-180 text-primary"
            )} 
          />
        </div>
      </div>

      {/* Expanded content */}
      <div 
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[500px] opacity-100 border-t" : "max-h-0 opacity-0 border-t-0"
        )}
      >
        <div className="p-4 bg-muted/5">
          <Textarea
            value={question}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter your question here... (Supports multi-line text and rich instructions)"
            className="min-h-[140px] resize-none bg-background border-muted-foreground/20 focus-visible:ring-1 focus-visible:ring-primary/30 transition-shadow leading-relaxed text-sm"
            onClick={(e) => e.stopPropagation()}
          />
          {/* <div className="mt-2 flex justify-end">
            <span className="text-[10px] text-muted-foreground italic">
              Auto-saving changes...
            </span>
          </div> */}
        </div>
      </div>
    </div>
  );
}

