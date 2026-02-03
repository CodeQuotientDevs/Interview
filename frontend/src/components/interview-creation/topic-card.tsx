import { useEffect, useState } from "react";
import { ChevronDown, Target, Clock, BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Controller } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuestionListEditor } from "@/components/question-list-editor/question-list-editor";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface TopicCardProps {
  topic: string;
  title: string;
  register: any;
  control: any;
  errors: any;
  topicIndex: number;
  watch: any;
}

export function TopicCard({ topic, title, register, control, errors, watch }: TopicCardProps) {

  const [isExpanded, setIsExpanded] = useState(true); // Expand all topics by default

  const weight = watch(`difficulty.${topic}.weight`);
  const duration = watch(`difficulty.${topic}.duration`);
  const difficulty = watch(`difficulty.${topic}.difficulty`);

  // Auto-expand when there are validation errors
  const hasErrors = errors && Object.keys(errors).length > 0;
  // const isExpanded = isExpanded || hasErrors;
  useEffect(()=>{
    if(hasErrors){
      setIsExpanded(true)
    }
  },[errors])

  const difficultyLabel = {
    "1": "Beginner",
    "2": "Intermediate",
    "3": "Expert"
  }[difficulty as string] || "Set Difficulty";

  return (
    <div 
      className={cn(
        "group rounded-xl border border-border bg-card transition-all duration-300 overflow-hidden",
        isExpanded ? "ring-1 ring-primary/20 shadow-md" : "hover:border-primary/20 hover:bg-muted/5 shadow-sm"
      )}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "p-2 rounded-lg transition-colors",
            isExpanded ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary/70"
          )}>
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-medium  text-foreground tracking-tight">{title}</h3>
            {!isExpanded && (
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  <BarChart3 className="h-3 w-3" />
                  {weight || 0}% weight
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-l pl-3">
                  <Clock className="h-3 w-3" />
                  {duration || 0} min
                </div>
                <Badge variant="outline" className="text-[9px] h-4 font-bold uppercase py-0 px-1.5 bg-background">
                  {difficultyLabel}
                </Badge>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
            <ChevronDown 
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-300 ease-out",
                isExpanded && "rotate-180 text-primary"
              )} 
            />
        </div>
      </div>

      {/* Content */}
      <div 
        className={cn(
          "transition-all duration-300 ease-in-out border-t",
          isExpanded ? "opacity-100" : "max-h-0 opacity-0 pointer-events-none border-transparent"
        )}
      >
        <div className="p-5 space-y-6 bg-muted/5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1">Weightage (%)</Label>
              <div className="relative">
                <Input 
                  type="number" 
                  placeholder="e.g. 40%" 
                  {...register(`difficulty.${topic}.weight`, { required: true, valueAsNumber: true })} 
                  className="h-10 bg-background border-muted-foreground/20 focus-visible:ring-1 focus-visible:ring-primary/30 transition-shadow"
                />
              </div>
              {errors?.weight && (
                <p className="text-[10px] font-bold text-destructive uppercase tracking-tight pl-1">{errors.weight.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1">Duration (min)</Label>
              <div className="relative">
                <Input 
                  type="number" 
                  placeholder="e.g. 15 min" 
                  {...register(`difficulty.${topic}.duration`, { required: true, valueAsNumber: true })} 
                  className="h-10 bg-background border-muted-foreground/20 focus-visible:ring-1 focus-visible:ring-primary/30 transition-shadow"
                />
              </div>
              {errors?.duration && (
                <p className="text-[10px] font-bold text-destructive uppercase tracking-tight pl-1">{errors.duration.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1">Difficulty Level</Label>
              <Controller
                name={`difficulty.${topic}.difficulty`}
                control={control}
                defaultValue={1}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field?.value?.toString()}>
                    <SelectTrigger className="h-10 bg-background border-muted-foreground/20 focus-visible:ring-1 focus-visible:ring-primary/30 transition-shadow">
                      <SelectValue placeholder="Select Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Skill Level</SelectLabel>
                        <SelectItem value={"1"}>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            Beginner
                          </div>
                        </SelectItem>
                        <SelectItem value={"2"}>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-orange-500" />
                            Intermediate
                          </div>
                        </SelectItem>
                        <SelectItem value={"3"}>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                            Expert
                          </div>
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="pt-2">
            <Controller
              name={`difficulty.${topic}.questionList`}
              control={control}
              defaultValue=""
              render={({ field }) => (
                <QuestionListEditor
                  value={field.value}
                  onChange={field.onChange}
                  topicTitle={title}
                />
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
