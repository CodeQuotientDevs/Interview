import * as React from "react"
import {
    type ColumnDef,
    type ColumnFiltersState,
    type SortingState,
    type VisibilityState,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, MoreHorizontal, Plus, FileText } from "lucide-react"

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
import { useNavigate } from "react-router"
import { interviewListItemSchema } from "@/zod/interview";
import { Loader } from "@/components/ui/loader"
import { formatDateTime } from "@/lib/utils"
import { useAppStore } from "@/store"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface DataTableInterface {
    loading: boolean,
    data: Array<typeof interviewListItemSchema._type>
    cloneInterview: (id: string) => Promise<void>
    searchFilter: string
    onSearchChange: (value: string) => void
    sortState: { id: string; desc: boolean }
    onSortChange: (columnId: string, desc: boolean) => void
}
export function InterviewDataTable(props: DataTableInterface) {
    const alertModels = useAppStore().useAlertModel;
    const { data, loading, cloneInterview, searchFilter, onSearchChange, sortState, onSortChange } = props;
    const [sorting, setSorting] = React.useState<SortingState>([
        {
            id: sortState.id,
            desc: sortState.desc
        }
    ])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
        searchFilter ? [{ id: "title", value: searchFilter }] : []
    )
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({})

    const navigation = useNavigate();

    // Update sorting when parent state changes
    React.useEffect(() => {
        setSorting([{ id: sortState.id, desc: sortState.desc }]);
    }, [sortState]);

    // Update filters when parent state changes
    React.useEffect(() => {
        setColumnFilters(searchFilter ? [{ id: "title", value: searchFilter }] : []);
    }, [searchFilter]);

    // Notify parent when sorting changes
    React.useEffect(() => {
        if (sorting.length > 0) {
            const currentSort = sorting[0];
            if (currentSort.id !== sortState.id || currentSort.desc !== sortState.desc) {
                onSortChange(currentSort.id, currentSort.desc ?? false);
            }
        }
    }, [sorting, sortState, onSortChange]);

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
            accessorKey: "title",
            enableHiding: false,
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
                    <button
                        onClick={() => navigation(`/interview/candidates/${id}`)}
                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left px-4 py-2 max-w-[600px] truncate"
                        title={title}
                    >
                        {title}
                    </button>
                );
            },
        },
        {
            accessorKey: "duration",
            header: () => <div className="text-center">Duration</div>,
            cell: ({ row }) => {
                const duration = parseFloat(row.getValue("duration"));
                return <div className="text-center min-w-24">{duration} minutes</div>
            },
        },
        // {
        //     accessorKey: "firstCreatedAt",
        //     header: ({ column }) => {
        //         return (
        //             <div className="text-center">
        //                 <Button
        //                     variant="ghost"
        //                     onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        //                 >
        //                     Created At
        //                     <ArrowUpDown />
        //                 </Button>
        //             </div>
        //         )
        //     },
        // },
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
                return <div className="text-center min-w-32">{formatDateTime(row.original.updatedAt)}</div>
            }
        },
        {
            id: "actions",
            header: () => <div className="text-center w-12"></div>,
            enableHiding: false,
            cell: ({ row }) => {
                const interview = row.original
                return (
                    <div className="text-center w-12">
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
    ], [navigation, handleClone])

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        manualSorting: true,
        manualFiltering: true,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
        },
    })

    return (
        <div className="w-full">
            <div className="flex items-center py-4 px-4 lg:px-6">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={() => navigation("/interview/add")} variant="default" className="mr-2">
                                <Plus size={16} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Create new interview</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <Input
                    placeholder="Search interview..."
                    value={searchFilter}
                    onChange={(event) => onSearchChange(event.target.value)}
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
            <div className="px-4 lg:px-6">
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
                                    <TableRow>
                                        <TableCell
                                            colSpan={columns.length}
                                            className="h-40 text-center"
                                        >
                                            <div className="flex flex-col items-center justify-center space-y-4 py-8">
                                                <div className="text-muted-foreground">
                                                    <FileText className="w-8 h-8 mx-auto" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium">No interviews yet</p>
                                                    <p className="text-xs text-muted-foreground">Create your first interview to get started</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : <></>
                            }
                        </TableBody>

                    </Table>
                </div>
            </div>
        </div>
    )
}
