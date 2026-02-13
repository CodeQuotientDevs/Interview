import { AppSidebar } from "../app-sidebar";
import { SidebarInset, SidebarProvider } from "../ui/sidebar";
import { Outlet } from "react-router";

export default function Mainlayout() {
    return <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
            <Outlet/>
        </SidebarInset>
    </SidebarProvider>
}