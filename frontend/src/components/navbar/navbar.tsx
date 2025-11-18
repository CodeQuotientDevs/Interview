import { useEffect, useMemo, useState } from "react";
import CQLogo from "@/assets/cq_logo_primary.png";
import { useAppStore } from "@/store";
import { Badge } from "../ui/badge";
import { TimerIcon } from "lucide-react";

interface NavbarProps {
    firstMessage?: string | null;
    startedAt?: string | Date | null;
    user?: {_id: string, name: string, email: string}
}

const formatElapsed = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

export const Navbar = ({ firstMessage, startedAt, user }: NavbarProps) => {
    const session = useAppStore().session;
    const start = useMemo(() => {
        if (!startedAt) return null;
        return typeof startedAt === 'string' ? new Date(startedAt) : startedAt;
    }, [startedAt]);

    const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
        if (!start) return 0;
        const diff = (Date.now() - start.getTime()) / 1000;
        return Math.max(0, Math.floor(diff));
    });

    useEffect(() => {
        if (!start) return;
        const tick = () => {
            const diff = (Date.now() - start.getTime()) / 1000;
            setElapsedSeconds(Math.max(0, Math.floor(diff)));
        }
        const id = setInterval(tick, 1000);
        tick();
        return () => clearInterval(id);
    }, [start]);

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
                <div className="ml-auto flex gap-4 flex-row justify-center">
                    <Badge variant={"outline"} className="flex items-center gap-1 font-mono">
                        <TimerIcon className="w-3 h-3"/>
                        {formatElapsed(elapsedSeconds)}
                    </Badge>
                    <div className="text-sm font-medium">{user?.name}</div>
                </div>
            </div >
        </div>
    )
};
