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
import { UsersIcon, ArrowUpDown, ArrowUpRightFromSquareIcon, CheckCircle, ChevronDown, CopyIcon,
     Download, FileText, MailPlus, MoreHorizontal, Upload, Clock, 
     Calendar} from "lucide-react"
import dayjs from 'dayjs';
import { ExcelColumn, jsonToExcel } from "@/lib/json-to-excel";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button"
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
import { interviewCandidateListSchema, interviewGetSchema } from "@/zod/interview";
import { Loader } from "@/components/ui/loader"

import { useAppStore } from "@/store";
import { AlertType } from "@/constants";
// import logger from "@/lib/logger";
import { DropdownMenuSeparator } from "@radix-ui/react-dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DataTableInterface {
    data: Array<typeof interviewCandidateListSchema._type>
    loading: boolean
    interviewName?: string | "Interview"
    interviewId?: string
    interviewObj?: typeof interviewGetSchema._type
    concludeInterview: (attemptId?: string) => Promise<void>,
    openCandidateDrawer: (value: boolean) => void
    openBulkUploadDrawer: (value: boolean) => void,
    revaluationFunction: (id: string) => Promise<void>,
    onEditCandidate?: (candidate: typeof interviewCandidateListSchema._type) => void,
}
export function InterviewCandidateTable(props: DataTableInterface) {

    const { interviewId, onEditCandidate } = props;
    const navigate = useNavigate();

    const showAlert = useAppStore().showAlert;
    const alertModel = useAppStore().useAlertModel;
    const { data, loading, openCandidateDrawer, openBulkUploadDrawer, interviewName, interviewObj } = props;
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [copyLinkModalOpen, setCopyLinkModalOpen] = React.useState(false);
    const [copyLinkId, setCopyLinkId] = React.useState("");
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

    const handleCopyInterview= (id: string) => {
        setCopyLinkModalOpen(true);
        setCopyLinkId(id);
    } 

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
                row[column.key] = `${window.location.origin}/interview/candidates/${interviewId}/report/${item.id}`;
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
            cell: ({ row }) => {
                const isCompleted = !!row.original.completedAt;
                const name = row.getValue("name") as string;
                
                if (isCompleted) {
                    return (
                        <button
                            onClick={() => navigate(`/interview/candidates/${interviewId}/report/${row.original.id}`)}
                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left flex items-center gap-2 px-4 py-2"
                        >
                            {name}
                            <FileText size={14} className="text-blue-500" />
                        </button>
                    );
                }
                
                return <div className="px-4 py-2">{name}</div>;
            },
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
                <div className="lowercase px-4 py-2">{row.getValue("email")}</div>
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
                return <div className="text-center">{formatDateTime(row.original.startTime)}</div>
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
                return <div className="text-center">{formatDateTime(row.original.endTime)}</div>
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
                    return <div className="text-center">Not Completed Yet</div>
                }
                return <div className="text-center">{row.original.score}</div>
            }
        },
        {
            id: "actions",
            header: () => <div className="text-center"></div>,
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
                                    onClick={() => onEditCandidate?.(row.original)}
                                >
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleCopyInterview(row.original.id)}
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
    ], [concludeUserInterview, handleReEvaluate, interviewId, navigate, onEditCandidate])

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
        state: {
            sorting,
            columnFilters,
            columnVisibility,
        },
    });
    return (
        <div className="w-full">
                <Dialog open={copyLinkModalOpen} onOpenChange={setCopyLinkModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Copy Link</DialogTitle>
                            <DialogDescription>Copy interview link</DialogDescription>
                        </DialogHeader>
                        <div className="flex items-center gap-2">
                                <div className="grid flex-1 gap-2">
                                <Input readOnly defaultValue={`${window.location.origin}/candidates/${copyLinkId}`}/>
                                </div>
                        </div>
                        <DialogFooter className="sm:justify-start">
                            <Button variant="outline" onClick={() => handleCopyInterviewLink(copyLinkId)}> <CopyIcon/> Copy</Button>
                            <Button variant="outline" onClick={() => {window.open(`${window.location.origin}/candidates/${copyLinkId}`, "_blank", "noopener,noreferrer")}}>
                                <ArrowUpRightFromSquareIcon/>
                                Open
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
                        placeholder="Search emails..."
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
                <div className="flex flex-col px-4 lg:px-6 gap-4">
                    <Card className="w-full rounded-2xl p-6 space-y-4">
                        <div>
                            <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-semibold">{interviewObj?.title}</h1>
                            <Badge className="bg-green-100 text-green-600">Active</Badge>
                            </div>
                            <p className="text-gray-600 text-sm mt-1 line-clamp-1">{interviewObj?.generalDescriptionForAi}</p>
                        </div>


                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b pb-4">
                            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                                <Clock className="w-5 h-5" />
                                <div>
                                <p className="text-xs text-gray-500">Duration</p>
                                <p className="font-medium">{interviewObj?.duration} minutes</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                            <Calendar className="w-5 h-5" />
                            <div>
                            <p className="text-xs text-gray-500">Created</p>
                            <p className="font-medium">{new Date(interviewObj?.createdAt || "-NA-").toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-xl">
                        <div className="w-5 h-5 flex items-center justify-center font-bold">↔</div>
                        <div>
                            <p className="text-xs text-gray-500">Skills</p>
                            <p className="font-medium">{Object.entries(interviewObj?.difficulty || {}).length} skill(s)</p>
                        </div>
                        </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Skill Breakdown</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(interviewObj?.difficulty || {}).map(([skill, d]) => (
                                    <div key={skill} className="flex items-center gap-4 p-3 border rounded-xl w-auto">
                                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                        <p className="font-medium">{skill}</p>
                                        <Badge className="bg-gray-100 text-gray-700">{d.difficulty}</Badge>
                                        <p className="text-sm text-gray-600">{d.weight}%</p>
                                        <p className="text-sm text-gray-600">• {d.duration}m</p>
                                    </div>
                                    ))
                                }
                            </div>
                        </div>
                    </Card>
                    <div className="rounded-md border">
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
                                            className="h-40 text-center"
                                        >
                                            <div className="flex flex-col items-center justify-center space-y-4 py-8">
                                                <div className="text-muted-foreground">
                                                    <UsersIcon className="w-8 h-8 mx-auto" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium">No candidates yet</p>
                                                    <p className="text-xs text-muted-foreground">Start by inviting candidates to this interview</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : null
                            }
                        </TableBody>
                    </Table>
                    </div>
                </div>
                <div className="flex items-center justify-end space-x-2 py-4 px-4 lg:px-6">
                    <div className="flex-1 text-sm text-muted-foreground">
                        {table.getFilteredRowModel().rows.length} row(s) total.
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
