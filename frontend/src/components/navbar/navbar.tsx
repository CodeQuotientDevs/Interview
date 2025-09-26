import CQLogo from "@/assets/cq_logo_primary.png";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNavigate } from "react-router";
import { LogOut } from "lucide-react"
import { useAppStore } from "@/store";
export const Navbar = () => {
    const navigation = useNavigate();
    const logout = useAppStore().logout;
    const session = useAppStore().session;

    const logoutUser = () => {
        logout();
    }
    return (
        <div
            className="border-grid sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4"
        >
            <div className="container-wrapper flex items-center">
                <div className="container flex h-14 items-center">
                    <div className="mr-4 hidden md:flex h-[70%]">
                        <img
                            src={CQLogo}
                            className="p-2"
                        />
                    </div>
                    {session
                        && (
                            <div className="flex items-center gap-4 text-sm xl:gap-6">
                                <Button
                                    onClick={() => {
                                        navigation('/interview');
                                    }}
                                    variant="link"
                                >
                                    Interview
                                </Button>
                            </div>
                        )
                    }
                </div>
                {session
                    && (
                        <div className="ml-auto flex">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost">{session.displayname}</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-fit mr-6">
                                    <DropdownMenuItem onClick={logoutUser}>
                                        <LogOut />
                                        <span>Log out</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )

                }
            </div >
        </div>
    )
};
