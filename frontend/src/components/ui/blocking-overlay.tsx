import React from 'react';

interface BlockingOverlayProps {
  imageSrc: string;
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

export const BlockingOverlay = ({ imageSrc, title, description, children }: BlockingOverlayProps) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
       <img 
         src={imageSrc} 
         alt={title || "Overlay"} 
         className="w-[400px] h-[400px] mb-8" 
         onError={(e) => e.currentTarget.style.display = 'none'} 
       />
       {children ? children : (
         <div className="text-center">
            {title && <p className="text-xl font-semibold text-center">{title}</p>}
            {description && <p className="text-muted-foreground mt-2">{description}</p>}
         </div>
       )}
    </div>
  );
};
