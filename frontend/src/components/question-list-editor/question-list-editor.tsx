import { useState, useEffect } from "react";
import { Plus, FileText, ExpandIcon, ShrinkIcon, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionItem } from "./question-item";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from "@dnd-kit/sortable";

interface QuestionListEditorProps {
  value: string;
  onChange: (value: string) => void;
  topicTitle?: string;
}

const DELIMITER = "\n[---]\n";

export function QuestionListEditor({ value, onChange, topicTitle }: QuestionListEditorProps) {
  // Use a stable ID for each question to help dnd-kit
  // We'll store questions with their IDs locally to avoid regenerating IDs on every change
  const [localQuestions, setLocalQuestions] = useState<{ id: string; content: string }[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sync value prop to local state
  useEffect(() => {
    const rawQuestions = value ? value.split(DELIMITER) : [""];
    
    // Attempt to preserve existing IDs if possible, otherwise generate new ones
    setLocalQuestions(prev => {
      const newQuestions = rawQuestions.map((content, idx) => {
        // If the content at this index matches what we had, try to keep the ID
        if (prev[idx] && prev[idx].content === content) {
          return prev[idx];
        }
        // Otherwise new ID
        return { id: Math.random().toString(36).substring(2, 11), content };
      });
      return newQuestions;
    });
  }, [value]);

  const triggerChange = (updated: { id: string; content: string }[]) => {
    setLocalQuestions(updated);
    onChange(updated.map(q => q.content).join(DELIMITER));
  };

  const addQuestion = () => {
    const newId = Math.random().toString(36).substring(2, 11);
    const updated = [...localQuestions, { id: newId, content: "" }];
    setExpandedIds(prev => {
        const next = new Set(prev);
        next.add(newId);
        return next;
    });
    triggerChange(updated);
  };

  const updateQuestion = (id: string, newContent: string) => {
    const updated = localQuestions.map(q => q.id === id ? { ...q, content: newContent } : q);
    triggerChange(updated);
  };

  const removeQuestion = (id: string) => {
    const updated = localQuestions.filter(q => q.id !== id);
    if (updated.length === 0) {
      triggerChange([{ id: Math.random().toString(36).substring(2, 11), content: "" }]);
    } else {
      triggerChange(updated);
    }
    setExpandedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllExpand = () => {
    if (expandedIds.size === localQuestions.length) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(localQuestions.map(q => q.id)));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localQuestions.findIndex(q => q.id === active.id);
      const newIndex = localQuestions.findIndex(q => q.id === over.id);
      
      const moved = arrayMove(localQuestions, oldIndex, newIndex);
      triggerChange(moved);
    }
  };

  const totalLines = localQuestions.reduce((acc, q) => acc + q.content.split('\n').filter(l => l.trim()).length, 0);
  const isAllExpanded = expandedIds.size === localQuestions.length && localQuestions.length > 0;

  return (
    <div className="w-full space-y-4 pt-4 border-t mt-4 first:border-0 first:pt-0 first:mt-0">
      {/* Header Container */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl  border border-primary/20 shadow-sm">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm  text-foreground tracking-tight">
                 Questions
              </h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[250px]">
                    <p className="text-xs">
                      These questions will be prioritized by the AI agent during the interview for this specific topic.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {localQuestions.filter(q => q.content.trim()).length} questions
              </span>
              {/* <span className="text-muted-foreground">·</span> */}
              {/* <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {totalLines} Content lines
              </span> */}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-auto sm:ml-0">
          <Button 
            type="button"
            variant="ghost" 
            size="sm"
            onClick={toggleAllExpand}
            className="text-[11px] font-bold h-8 text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
          >
            {isAllExpanded ? (
              <>
                <ShrinkIcon className="h-3.5 w-3.5" />
                Collapse All
              </>
            ) : (
              <>
                <ExpandIcon className="h-3.5 w-3.5" />
                Expand All
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Question List Area with Drag and Drop */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-3 relative">
          <div className="absolute left-[34px] top-6 bottom-6 w-0.5 bg-muted/40 rounded-full" />
          <SortableContext 
            items={localQuestions.map(q => q.id)}
            strategy={verticalListSortingStrategy}
          >
            {localQuestions.map((q, index) => (
              <QuestionItem
                key={q.id}
                id={q.id}
                index={index}
                question={q.content}
                isExpanded={expandedIds.has(q.id)}
                onToggle={() => toggleExpand(q.id)}
                onChange={(val) => updateQuestion(q.id, val)}
                onRemove={() => removeQuestion(q.id)}
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>

      {/* Footer Controls */}
      <div className="flex flex-col gap-3 pt-2">
        <Button 
          type="button"
          variant="outline" 
          className="w-full border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all duration-200 h-10 group"
          onClick={addQuestion}
        >
          <div className="flex items-center gap-2 group-hover:scale-[1.02] transition-transform">
            <Plus className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wide text-primary/80">Add custom question</span>
          </div>
        </Button>
        
        {/* <div className="p-3 rounded-lg bg-orange-50/50 border border-orange-100 flex items-start gap-3">
          <div className="mt-0.5 bg-orange-100 p-1 rounded-full">
             <Plus className="h-2.5 w-2.5 text-orange-600 rotate-45" />
          </div>
          <p className="text-[10px] leading-relaxed text-orange-800 font-medium">
            Pro Tip: Be specific with your questions and use multi-line content for detailed instructions. The AI will follow your structure to evaluate candidates more accurately.
          </p>
        </div> */}
      </div>
    </div>
  );
}
