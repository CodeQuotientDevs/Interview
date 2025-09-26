import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { FileUpload } from "../ui/file-upload";
import type { FileUploadProps } from "../ui/file-upload"
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";

type FileUploadDrawerProps = {
    open: boolean;
    showUploadButton: boolean;
    setOpenDrawer: (value: boolean) => void;
    uploadFile: () => void;
} & FileUploadProps;

export const FileUploadDrawer = ({ open, showUploadButton, setOpenDrawer, uploadFile, ...fileUploadArgs }: FileUploadDrawerProps) => {
    const drawerRef = useRef<HTMLDivElement | null>(null);

    const handleOutsideClick = useCallback((e: MouseEvent) => {
        if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
            setOpenDrawer(false);
        }
    }, [setOpenDrawer]);

    useEffect(() => {
        if (open) {
            window.requestAnimationFrame(() => {
                document.body.addEventListener("click", handleOutsideClick);
            });
            return () => {
                document.body.removeEventListener("click", handleOutsideClick);
            };
        }
    }, [open, handleOutsideClick]);

    return (
        <Drawer open={open} onOpenChange={setOpenDrawer}>
            {/* Wrap the content with an onClick that stops propagation */}
            <DrawerContent
                ref={drawerRef}
                className="max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-full text-sm">
                    <a className="ml-auto flex flex-row gap-2 w-fit" href="/candidate-bulk-upload.xlsx">
                       <DownloadIcon size={16}/>
                       Download Template
                    </a>
                </div>
                <FileUpload
                    {...fileUploadArgs}
                />
                {showUploadButton
                    && (
                        <Button onClick={uploadFile}>
                            Upload
                        </Button>
                    )
                }
            </DrawerContent>
        </Drawer>
    );
};
