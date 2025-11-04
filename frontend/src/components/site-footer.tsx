export function SiteFooter({
  height = "14", 
  sticky = true,
  children
} : {
  height?: "12" | "14" | "16" | "20" | "24",
  sticky?: boolean,
  children?: React.ReactNode
}) {
  
  const heightClasses = {
    "12": "h-12 group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
    "14": "h-14 group-has-data-[collapsible=icon]/sidebar-wrapper:h-14", 
    "16": "h-16 group-has-data-[collapsible=icon]/sidebar-wrapper:h-16",
    "20": "h-20 group-has-data-[collapsible=icon]/sidebar-wrapper:h-20",
    "24": "h-24 group-has-data-[collapsible=icon]/sidebar-wrapper:h-24"
  };

  return (
    <footer className={`
      ${heightClasses[height]} 
      ${sticky ? "sticky bottom-0 z-50" : ""} 
      flex shrink-0 items-center border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear
    `}>
      <div className="flex w-full items-center justify-end px-4 lg:px-6">
        {children}
      </div>
    </footer>
  )
}