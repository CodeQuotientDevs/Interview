import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
// import {
//     Select,
//     SelectContent,
//     SelectItem,
//     SelectTrigger,
//     SelectValue,
// } from "@/components/ui/select";
import { useState } from "react";
import { Loader2, X } from "lucide-react";

interface User {
    id: string;
    name: string;
    email: string;
}

interface ShareInterviewModalProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    interviewName: string;
    users: User[];
    onShare: (email: string) => Promise<void>;
    onUnshare: (userId: string) => Promise<void>;
}

export const ShareInterviewModal = ({ open, setOpen, interviewName, users, onShare, onUnshare }: ShareInterviewModalProps) => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handleInvite = async () => {
        if (!email) return;
        setLoading(true);
        try {
            await onShare(email);
            setEmail("");
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(" ").splice(0, 2)
            .map((n) => n[0])
            .join("")
            .toUpperCase();
    };


    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md ">
                    <DialogHeader>
                        <DialogTitle>Share "{interviewName}"</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center space-x-2">
                        <div className="grid flex-1 gap-2">
                            <Input
                                placeholder="Add people with email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <Button type="button" className="px-3" onClick={handleInvite} disabled={loading || !email}>
                            {loading &&
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            }
                            {loading ? "sharing..." : "share"}
                        </Button>
                    </div>

                    <div className="space-y-4 mt-6">
                        <h4 className="text-sm font-medium leading-none">People with access</h4>
                        <div className="grid gap-6 max-h-[400px] overflow-y-auto">
                            {users.map((user, index) => (
                                <div key={user.id || index} className="flex items-center justify-between space-x-4">
                                    <div className="flex items-center space-x-4">
                                        <Avatar className="h-8 w-8 rounded-lg">
                                            <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium leading-none">{user.name}</p>
                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onUnshare(user.id)}
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            {users.length === 0 && (
                                <p className="text-sm text-muted-foreground italic">No other users have access.</p>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
