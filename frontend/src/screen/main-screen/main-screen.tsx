import { Navbar } from "@/components/navbar"
import { Outlet } from "react-router"

export const MainScreen = () => {
    return (
        <div className="h-full">
            <div className="fixed top-0 left-0 w-full h-[60px] z-50">
            <Navbar />
            </div>
            <div className="pt-[60px] h-full">
                <Outlet />
            </div>
        </div>
    )
}