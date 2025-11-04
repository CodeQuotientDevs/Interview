import * as React from "react"
import {
  type UniqueIdentifier,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  ColumnDef,
  ColumnFiltersState,
  Row,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { z } from "zod"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useEffect, useState } from "react"

export const RecentInterviewSchema = z.object({
  _id: z.string(),
  interviewId: z.string(),
  userId: z.string(),
  startTime: z.string().datetime(),
  createdAt: z.string().datetime(),
  interview: z.object({
    _id: z.string(),
    title: z.string(),
    duration: z.number(),
    id: z.string(),
  }),
  user: z.object({
    _id: z.string(),
    email: z.string().email(),
    id: z.string(),
    name: z.string(),
  }),
});
type RecentInterview = z.infer<typeof RecentInterviewSchema>;



function DraggableRow({ row }: { row: Row<z.infer<typeof RecentInterviewSchema>> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original._id,
  })

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

const columns: ColumnDef<RecentInterview>[] = [
  {
    accessorFn: (row) => row.interview.title,
    id: "interviewTitle",
    header: "Interview Title",
    cell: ({ getValue }) => (
      <div className="max-w-sm line-clamp-1">{getValue() as string}</div>
    ),
  },
  {
    accessorFn: (row) => row.user.name,
    id: "userName",
    header: "Candidate Name",
    cell: ({ getValue }) => <div>{getValue() as string}</div>,
  },
  {
    accessorFn: (row) => row.user.email,
    id: "userEmail",
    header: "Email",
    cell: ({ getValue }) => (
      <div className="text-muted-foreground">{getValue() as string}</div>
    ),
  },
  {
    accessorFn: (row) => row.interview.duration,
    id: "duration",
    header: "Duration (min)",
    cell: ({ getValue }) => <div>{getValue() as number}</div>,
  },
  {
    accessorFn: (row) => row.startTime,
    id: "startTime",
    header: "Start Time",
    cell: ({ getValue }) => (
        <div className="text-muted-foreground">{new Date(getValue() as string).toLocaleString()}</div>
    ),
  },
  {
    accessorFn: (row) => row.createdAt,
    id: "createdAt",
    header: "Created At",
    cell: ({ getValue }) => (
        <div className="text-muted-foreground">{new Date(getValue() as string).toLocaleString()}</div>
    ),
  },
];

export function DataTable({
  data: initialData,
}: {
  data: z.infer<typeof RecentInterviewSchema>[]
}) {

  const [data, setData] = useState(initialData);
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ _id }) => _id) || [],
    [data]
  )

    const table = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection, columnFilters, columnVisibility },
    getRowId: (row) => row._id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  useEffect(() => {
    setData(initialData);
  }, [initialData])

  return (
    <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
                {table.getRowModel().rows.map((row) => (
                  <DraggableRow key={row.id} row={row} />
                ))}
              </SortableContext>
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
    </div>
  )
}
