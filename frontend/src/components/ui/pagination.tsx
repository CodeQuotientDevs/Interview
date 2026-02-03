
import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    pageSizeOptions?: number[];
    className?: string;
    totalCount?: number;
}

export function Pagination({
    currentPage,
    totalPages,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 20, 50, 100],
    className,
    totalCount
}: PaginationProps) {
    const handlePageSizeChange = (value: string) => {
        onPageSizeChange(Number(value));
    };

    // Helper to generate page numbers
    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 7; // 1 ... 4 5 6 ... 10

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always include first page
            pages.push(1);

            if (currentPage > 3) {
                pages.push('ellipsis-start');
            }

            // Calculate range around current page
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            // Adjust if near beginning or end
            let rangeStart = start;
            let rangeEnd = end;
            
             if (currentPage < 4) {
                rangeEnd = 4;
            } else if (currentPage > totalPages - 3) {
                rangeStart = totalPages - 3;
            }

            for (let i = rangeStart; i <= rangeEnd; i++) {
                if (i > 1 && i < totalPages) {
                     pages.push(i);
                }
            }

            if (currentPage < totalPages - 2) {
                pages.push('ellipsis-end');
            }

            // Always include last page
            pages.push(totalPages);
        }
        return pages;
    };


    return (
        <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-4 px-2", className)}>
             <div className="flex-1 text-sm text-muted-foreground whitespace-nowrap">
                {totalCount !== undefined ? (
                    <>
                        Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} entries
                    </>
                ) : (
                    <>Page {currentPage} of {totalPages}</>
                )}
            </div>
            
            <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Rows per page</p>
                    <Select
                        value={`${pageSize}`}
                        onValueChange={handlePageSizeChange}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={pageSize} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {pageSizeOptions.map((size) => (
                                <SelectItem key={size} value={`${size}`}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 lg:flex"
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                    >
                        <span className="sr-only">Go to first page</span>
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        <span className="sr-only">Go to previous page</span>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="hidden md:flex items-center space-x-1">
                        {getPageNumbers().map((page, index) => (
                             <React.Fragment key={index}>
                                {page === 'ellipsis-start' || page === 'ellipsis-end' ? (
                                    <span className="px-2 text-muted-foreground">...</span>
                                ) : (
                                    <Button
                                        variant={currentPage === page ? "default" : "outline"}
                                        className="h-8 w-8 p-0"
                                        onClick={() => onPageChange(page as number)}
                                    >
                                        {page}
                                    </Button>
                                )}
                             </React.Fragment>
                        ))}
                    </div>

                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        <span className="sr-only">Go to next page</span>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 lg:flex"
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage === totalPages}
                    >
                        <span className="sr-only">Go to last page</span>
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
