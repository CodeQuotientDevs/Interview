import { useEffect, useMemo, useState } from "react";
import CQLogo from "@/assets/cq_logo_primary.png";
import { Badge } from "../ui/badge";
import { TimerIcon, LayoutTemplate, Check } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "../ui/button";

interface NavbarProps {
    startedAt?: string | Date | null;
    completedAt?: string | Date | null;
    user?: {_id: string, name: string, email: string};
    layout?: 'editor-left' | 'editor-right';
    setLayout?: (layout: 'editor-left' | 'editor-right') => void;
    isInterviewCompleted?: boolean;
}

const formatElapsed = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}


export const Navbar = ({ startedAt, user, completedAt, layout, setLayout, isInterviewCompleted }: NavbarProps) => {
    const start = useMemo(() => {
        if (!startedAt) return null;
        return typeof startedAt === 'string' ? new Date(startedAt) : startedAt;
    }, [startedAt]);

    const end = useMemo(() => {
        if (!completedAt) return null;
        return typeof completedAt === "string"
            ? new Date(completedAt)
            : completedAt;
    }, [completedAt]);

    const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
        if (!start) return 0;
        const endTime = end ? end.getTime() : Date.now();
        const diff = (endTime - start.getTime()) / 1000;
        return Math.max(0, Math.floor(diff));
    });

    useEffect(() => {
         if (!start) {
            setElapsedSeconds(0);
            return;
        }
        // If interview is completed or completedAt is set, stop the timer
        if (isInterviewCompleted || end) {
            const endTime = end ? end.getTime() : Date.now(); // Use current time if completedAt is not explicitly set but interview is completed
            const diff = (endTime - start.getTime()) / 1000;
            setElapsedSeconds(Math.max(0, Math.floor(diff)));
            return;
        }
        const tick = () => {
            const diff = (Date.now() - start.getTime()) / 1000;
            setElapsedSeconds(Math.max(0, Math.floor(diff)));
        }
        const id = setInterval(tick, 1000);
        tick();
        return () => clearInterval(id);
    }, [start, end, isInterviewCompleted]);

    return (
        <div
            className="border-grid sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4"
        >
            <div className="container-wrapper flex items-center">
                <div className="container flex h-14 items-center gap-4">
                    <div className="mr-4 hidden md:flex h-[70%]">
                        <img
                            src={CQLogo}
                            className="p-2"
                        />
                    </div>
                    <div className="flex flex-col">
                    </div>
                </div>
                <div className="ml-auto flex gap-4 flex-row justify-center items-center">
                     {/* Layout Switcher */}
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <LayoutTemplate className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[300px] p-2">
                            <div className="font-semibold text-center py-2">Editor Position</div>
                             <div className="grid grid-cols-2 gap-2">
                                <DropdownMenuItem 
                                    className={`flex flex-col gap-2 p-2 cursor-pointer items-center justify-center border-2 rounded-md ${layout === 'editor-left' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-muted'}`}
                                    onClick={() => setLayout && setLayout('editor-left')}
                                >
                                    <div className="flex w-full h-20 gap-1 p-1 bg-background border rounded overflow-hidden relative">
                                        <div className="w-1/2 h-full bg-slate-200 rounded-sm"></div>
                                        <div className="w-1/2 h-full bg-slate-100 rounded-sm"></div>
                                        {layout === 'editor-left' && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20">
                                                <div className="bg-blue-500 rounded-full p-0.5">
                                                     <Check className="w-3 h-3 text-white" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-xs font-medium">Left</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    className={`flex flex-col gap-2 p-2 cursor-pointer items-center justify-center border-2 rounded-md ${layout === 'editor-right' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-muted'}`}
                                    onClick={() => setLayout && setLayout('editor-right')}
                                >
                                    <div className="flex w-full h-20 gap-1 p-1 bg-background border rounded overflow-hidden relative">
                                        <div className="w-1/2 h-full bg-slate-100 rounded-sm"></div>
                                        <div className="w-1/2 h-full bg-slate-200 rounded-sm"></div>
                                        {layout === 'editor-right' && (
                                              <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20">
                                                <div className="bg-blue-500 rounded-full p-0.5">
                                                     <Check className="w-3 h-3 text-white" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-xs font-medium">Right</span>
                                </DropdownMenuItem>
                             </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                     <Badge variant={"outline"} className="flex items-center gap-1 font-mono">
                        <TimerIcon className="w-3 h-3"/>
                        {formatElapsed(elapsedSeconds)}
                    </Badge>
                    <div className="text-sm font-medium w-full">{user?.name}</div>
                </div>
            </div >
        </div>
    )
};
