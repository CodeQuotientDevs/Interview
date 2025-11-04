import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router"

export function SiteHeader({
  title, 
  breadcrumbs,
  height = "14", 
  sticky = true, 
  showBack = false, 
  backTo,
  onBack
} : {
  title?: string,
  breadcrumbs?: Array<{label: string, href?: string}>,
  height?: "12" | "14" | "16" | "20" | "24",
  sticky?: boolean,
  showBack?: boolean,
  backTo?: string,
  onBack?: () => void
}) {
  const navigate = useNavigate();
  
  const heightClasses = {
    "12": "h-12 group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
    "14": "h-14 group-has-data-[collapsible=icon]/sidebar-wrapper:h-14", 
    "16": "h-16 group-has-data-[collapsible=icon]/sidebar-wrapper:h-16",
    "20": "h-20 group-has-data-[collapsible=icon]/sidebar-wrapper:h-20",
    "24": "h-24 group-has-data-[collapsible=icon]/sidebar-wrapper:h-24"
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1); // Browser back
    }
  };

  const renderTitle = () => {
    if (breadcrumbs && breadcrumbs.length > 0) {
      return (
        <div className="flex items-center gap-2 text-sm font-medium">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              {crumb.href ? (
                <button
                  onClick={() => navigate(crumb.href!)}
                  className="hover:text-foreground text-muted-foreground transition-colors hover:underline whitespace-nowrap"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="text-foreground whitespace-nowrap">{crumb.label}</span>
              )}
              {index < breadcrumbs.length - 1 && (
                <span className="text-muted-foreground/50 text-sm px-1">›</span>
              )}
            </div>
          ))}
        </div>
      );
    }
    return <h1 className="text-sm font-medium">{title || ""}</h1>;
  };

  return (
    <header className={`
      ${heightClasses[height]} 
      ${sticky ? "sticky top-0 z-50" : ""} 
      flex shrink-0 items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear
    `}>
      <div className="flex w-full items-center justify-between px-4 lg:px-6">
        {/* Left side - Sidebar and Title */}
        <div className="flex items-center gap-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-4"
          />
          {renderTitle()}
        </div>
        
        {/* Right side - Back Button */}
        {showBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="h-8 hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go back</span>
          </Button>
        )}
      </div>
    </header>
  )
}
