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
import { ArrowUpDown, ChevronDown, MoreHorizontal, Plus } from "lucide-react"

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
import { useNavigate } from "react-router"
import { interviewListItemSchema } from "@/zod/interview";
import { Loader } from "@/components/ui/loader"
import { ScrollArea } from "@radix-ui/react-scroll-area"
import dayjs from "dayjs"
import { useAppStore } from "@/store"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface DataTableInterface {
    loading: boolean,
    data: Array<typeof interviewListItemSchema._type>
    cloneInterview: (id: string) => Promise<void>
}
export function InterviewDataTable(props: DataTableInterface) {
    const alertModels = useAppStore().useAlertModel;
    const { data, loading, cloneInterview } = props;
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
        []
    )
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({});

    const navigation = useNavigate();

    const handleClone = React.useCallback((id: string, title: string) => {
        alertModels({
            title: `Are you sure you want to clone ${title}?`,
            description: 'This operation will clone the interview.',
            cancelButtonTitle: 'Cancel',
            okButtonTitle: 'Ok',
            onCancel: async () => { },
            onOk: async () => {
                return cloneInterview(id);
            }
        })
    }, [alertModels, cloneInterview]);

    const columns: ColumnDef<typeof interviewListItemSchema._type>[] = React.useMemo(() => [
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
            accessorKey: "title",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Title
                        <ArrowUpDown />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const { id } = row.original;
                const title = row.getValue("title") as string;
                return (
                    <div className="lowercase">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="link"
                                        onClick={() => {
                                            navigation(`/interview/candidates/${id}`);
                                        }}
                                    >
                                        {title}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Go to {title}'s candidate list</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                )
                return <Button variant="link">Link</Button>
                return <div className="lowercase">{row.getValue("title")}</div>;
            },
        },
        {
            accessorKey: "duration",
            header: () => <div className="text-center">Duration</div>,
            cell: ({ row }) => {
                const duration = parseFloat(row.getValue("duration"));
                return <div className="text-center font-medium">{duration} minutes</div>
            },
        },
        {
            accessorKey: "updatedAt",
            header: ({ column }) => {
                return (
                    <div
                        className="text-center"
                    >
                        <Button
                            variant="ghost"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            Updated At
                            <ArrowUpDown />
                        </Button>
                    </div>

                )
            },
            cell: ({ row }) => {
                const updatedAtString = dayjs(row.original.updatedAt).format('DD MMM YYYY, hh:mm A');
                return <div className="text-center font-medium">{updatedAtString}</div>
            }
        },
        {
            accessorKey: "keywords",
            header: () => <div className="text-center">Keywords</div>,
            cell: ({ row }) => {
                const keywords = (row.original.keywords ?? []).join(', ');
                return <div className="text-ellipsis">{keywords}</div>
            }
        },
        {
            id: "actions",
            header: () => <div className="text-center" >Actions</div>,
            enableHiding: false,
            cell: ({ row }) => {
                const interview = row.original
                return (
                    <div className="text-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                    onClick={() => navigation(`/interview/add/${interview.id}`)}
                                >
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleClone(interview.id, interview.title)}
                                >
                                    Clone
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        },
    ], [navigation])

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
    })

    return (
        <div className={`w-full`}>
            <div>
                <div className="flex items-center py-4">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={() => navigation("/interview/add")} variant="outline" className="mr-2">
                                    <Plus size={20} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Send invite</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <Input
                        placeholder="Filter interview..."
                        value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            table.getColumn("title")?.setFilterValue(event.target.value)
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
                <div className="rounded-md border">
                    <ScrollArea className="w-full max-h-[65vh] overflow-y-scroll">
                        <Table>
                            <TableHeader className="bg-background z-10 shadow-sm">
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
                            <TableBody className="w-full">
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
                                        <>
                                            <TableRow>
                                                <TableCell
                                                    colSpan={columns.length}
                                                    className="h-24 text-center"
                                                >
                                                    No results.
                                                </TableCell>
                                            </TableRow>
                                        </>
                                    ) : <></>
                                }
                            </TableBody>

                        </Table>
                    </ScrollArea>

                </div>
                <div className="flex items-center justify-end space-x-2 py-4">
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
        </div>
    )
}
