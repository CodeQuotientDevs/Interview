import * as React from "react"
import {
    type ColumnDef,
    type ColumnFiltersState,
    type SortingState,
    type VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, CheckCircle, ChevronDown, Download, MailPlus, MoreHorizontal, Upload, UserPlus } from "lucide-react"
import dayjs from 'dayjs';
import { ExcelColumn, jsonToExcel } from "@/lib/json-to-excel";
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { interviewCandidateListSchema } from "@/zod/interview";
import { Loader } from "@/components/ui/loader"

import { useAppStore } from "@/store";
import { AlertType } from "@/constants";
// import logger from "@/lib/logger";
import { DropdownMenuSeparator } from "@radix-ui/react-dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router";

interface DataTableInterface {
    data: Array<typeof interviewCandidateListSchema._type>
    loading: boolean
    interviewName?: string | "Interview"
    interviewId?: string

    concludeInterview: (attemptId?: string) => Promise<void>,
    openCandidateDrawer: (value: boolean) => void
    openBulkUploadDrawer: (value: boolean) => void,
    revaluationFunction: (id: string) => Promise<void>,

}
export function InterviewCandidateTable(props: DataTableInterface) {

    const { interviewId } = props;
    const navigate = useNavigate();

    const showAlert = useAppStore().showAlert;
    const alertModel = useAppStore().useAlertModel;
    const { data, loading, openCandidateDrawer, openBulkUploadDrawer, interviewName } = props;
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({});

   
    // const handleDeleteInvite = React.useCallback((id: string) => {
    //     showAlert({
    //         time: 10,
    //         title: 'Delete feature not implemented yet.',
    //         type: AlertType.error,
    //         message: 'If this feature is required on urgent basis, then contact tech support.'
    //     });
    //     logger.info('Deleting candidate interview: ', id);
    // }, [showAlert]);

    const handleCopyInterviewLink = React.useCallback(async (id: string) => {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/candidates/${id}`);
            showAlert({
                time: 5,
                title: 'Link copied',
                type: AlertType.success,
                message: 'Interview link copied successfully to clipboard.'
            });
        } catch (error) {
            let errorToShow: string = 'Something went wrong.';
            if (error instanceof Error) {
                errorToShow = error.message;
            }
            if (typeof error === 'string') {
                errorToShow = error;
            }
            showAlert({
                time: 5,
                title: 'Error while coping link',
                type: AlertType.error,
                message: errorToShow,
            });
        }

    }, [showAlert]);

    const concludeUserInterview = React.useCallback( async (id?: string) => {
        let title = "Are you sure you want to conclude this interview?";
        if (!id) {
            title = "Are you sure you want to conclude all the interviews?";
        }
        alertModel({
            title: title,
            description: 'This action is not reversible.',
            onCancel: async () => { },
            onOk: async () => {
                await props.concludeInterview(id);
            },
            cancelButtonTitle: "Cancel",
            okButtonTitle: "Conclude Interview"
        });
    }, [alertModel, props]);

    const handleReEvaluate = React.useCallback(async (id: string) => {
        alertModel({
            title: 'Are you sure you want to re evaluate interview?',
            description: 'This is reevaluate the user test, score will be effected.',
            cancelButtonTitle: 'Cancel',
            okButtonTitle: 'Ok',
            onCancel: async () => { },
            onOk: async () => {
                await props.revaluationFunction(id);
            }
        });
    }, [props, alertModel]);

    function rowFormatter(item:typeof interviewCandidateListSchema._type, columns: ExcelColumn[]){
        const row: Record<string, unknown> = {};
        columns.forEach(column => {
            const value = item[column.key as keyof typeof item] as unknown;
            
            if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
                row[column.key] = value ? dayjs(value).format('DD-MM-YYYY HH:mm:ss') : 'N/A';
            }else if(column.key == "reports"){
                row[column.key] = `${window.location.origin}/interview/candidates/${interviewId}?userid=${item.id}`
            }else {
                row[column.key] = value !== undefined && value !== null ? value : 'N/A';
            }
        });
        return row;
    }

    function handleDownload(){
        if(data && data.length > 0){
            const columns = [
                { header: 'Name', key: 'name', width: 30 },
                { header: 'Email', key: 'email', width: 30 },
                { header: 'Start Time',key:'startTime',width:30},
                { header: 'Completed At', key: 'completedAt', width: 30 },
                { header: 'Reports', key: 'reports', width: 20 },
                { header: 'Score', key: 'score', width: 20 },  
            ];
            const filename = `${interviewName}.xlsx`;
            
            jsonToExcel(data, columns, filename,rowFormatter).catch(() => {
                showAlert({
                    time: 5,
                    title: 'Unable to generate report',
                    type: AlertType.error,
                    message: 'An error occurred while generating the Excel file. Please try again.'
                });
            });
        }
    }

    const columns: ColumnDef<typeof interviewCandidateListSchema._type>[] = React.useMemo(() => [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && "indeterminate")
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Name
                        <ArrowUpDown />
                    </Button>
                )
            },
            cell: ({ row }) => (
                <div className="font-medium">{row.getValue("name")}</div>
            ),
        },
        {
            accessorKey: "email",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Email
                        <ArrowUpDown />
                    </Button>
                )
            },
            cell: ({ row }) => (
                <div className="lowercase">{row.getValue("email")}</div>
            ),
        },
        {
            accessorKey: "startTime",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Start Time
                        <ArrowUpDown />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const startTimeString = dayjs(row.original.startTime).format(`YYYY-MM-DD HH:mm:ss`)
                return <div className="text-center font-medium">{startTimeString}</div>
            },
        },
        {
            accessorKey: "endTime",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        End Time
                        <ArrowUpDown />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const endTime = row.original.endTime;
                if (!endTime) {
                    return <></>
                }
                const formattedEndTime = dayjs(endTime).format('YYYY-MM-DD HH:mm:ss');
                return <div className="text-center font-medium">{formattedEndTime}</div>
            }
        },
        {
            accessorKey: "score",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Score
                        <ArrowUpDown />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const isCompleted = !!row.original.completedAt;
                if (!isCompleted) {
                    return <div className="text-center font-medium">Not Completed Yet</div>
                }
                return <div className="text-center font-medium">{row.original.score}</div>
            }
        },
        {
            id: "actions",
            header: () => <div className="text-center" >Actions</div>,
            enableHiding: false,
            cell: ({ row }) => {
                return (
                    <div className="text-center max-h-[80vh] overflow-auto">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                {/* <DropdownMenuItem
                                    onClick={() => handleDeleteInvite(interview.id)}
                                >
                                    Delete
                                </DropdownMenuItem>
                                <DropdownMenuSeparator /> */}
                                {/* <DropdownMenuItem
                                    onClick={() => navigation(`/interview/add/${interview.id}`)}
                                >
                                    Info
                                </DropdownMenuItem> */}
                                <DropdownMenuItem
                                    onClick={() => handleCopyInterviewLink(row.original.id)}
                                >
                                    Interview Link
                                </DropdownMenuItem>
                                {row.original.completedAt
                                    && (
                                        <>
                                            <DropdownMenuItem
                                                onClick={() => navigate(`/interview/candidates/${interviewId}/report/${row.original.id}`)}
                                            >
                                                Detailed Report
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => handleReEvaluate(row.original.id)}
                                            >
                                                Re Evaluate
                                            </DropdownMenuItem>
                                        </>
                                    )
                                }
                                {!row.original.completedAt
                                    && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => concludeUserInterview(row.original.id)}
                                            >
                                                Conclude Interview
                                            </DropdownMenuItem>
                                        </>
                                    )
                                }
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        },
    ], [concludeUserInterview, handleCopyInterviewLink, handleReEvaluate])

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    });

    return (
        <div className="w-full">
                <div className="flex items-center py-4 px-4 lg:px-6">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={() => openCandidateDrawer(true)} variant="default" className="mr-2">
                                    <MailPlus size={16} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Send invite</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={() => openBulkUploadDrawer(true)} variant="outline" className="mr-2">
                                    <Upload size={16} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Send invite in bulk</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={() => concludeUserInterview()} variant="outline" className="mr-2">
                                    <CheckCircle size={16} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Conclude every user interview</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button className="mr-2" variant="outline" onClick={handleDownload}><Download size={16} /></Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Download user report</p>
                            </TooltipContent>
                        </Tooltip>


                    </TooltipProvider>
                    <Input
                        placeholder="Filter emails..."
                        value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            table.getColumn("email")?.setFilterValue(event.target.value)
                        }
                        className="max-w-sm"
                    />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="ml-auto">
                                Columns <ChevronDown />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {table
                                .getAllColumns()
                                .filter((column) => column.getCanHide())
                                .map((column) => {
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) =>
                                                column.toggleVisibility(!!value)
                                            }
                                        >
                                            {column.id}
                                        </DropdownMenuCheckboxItem>
                                    )
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="rounded-md border mx-4 lg:mx-6">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {loading &&
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center"
                                    >
                                        <Loader />
                                    </TableCell>
                                </TableRow>
                            }
                            {!loading && table.getRowModel().rows?.length
                                ? table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                                : <></>
                            }
                            {!loading && table.getRowModel().rows.length === 0
                                ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={columns.length}
                                            className="h-32 text-center"
                                        >
                                            <div className="flex flex-col items-center justify-center space-y-3">
                                                <div className="text-muted-foreground">
                                                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.5v15m7.5-7.5h-15" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">No candidates yet</p>
                                                    <p className="text-xs text-muted-foreground mt-1">Start by inviting candidates to this interview</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : null
                            }
                        </TableBody>
                    </Table>
                </div>
                <div className="flex items-center justify-end space-x-2 py-4 px-4 lg:px-6">
                    <div className="flex-1 text-sm text-muted-foreground">
                        {table.getFilteredSelectedRowModel().rows.length} of{" "}
                        {table.getFilteredRowModel().rows.length} row(s) selected.
                    </div>
                    <div className="space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            Next
                        </Button>
                    </div>
                </div>
        </div>
    )
}
