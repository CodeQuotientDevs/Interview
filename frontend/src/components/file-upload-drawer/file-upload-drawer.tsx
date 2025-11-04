import { FileUpload } from "../ui/file-upload";
import type { FileUploadProps } from "../ui/file-upload"
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

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
    <Dialog open={open} onOpenChange={setOpenDrawer}>
      <DialogContent
        className="max-h-[80vh] flex flex-col sm:max-w-[500px]"
      >
        <DialogHeader>
          <DialogTitle>Bulk Upload Candidates</DialogTitle>
          <DialogDescription>
            Download the Excel template, fill in candidate details, and upload it back.
          </DialogDescription>
        </DialogHeader>

        <div className="w-full text-sm mb-2">
          <a
            className="ml-auto flex flex-row gap-2 w-fit text-primary underline"
            href="/candidate-bulk-upload.xlsx"
            download
          >
            <DownloadIcon size={16} />
            Download Template
          </a>
        </div>

        <FileUpload {...fileUploadArgs} />

        {showUploadButton && (
          <div className="pt-4 flex justify-end">
            <Button onClick={uploadFile}>Upload</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
