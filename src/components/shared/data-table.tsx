import Link from "next/link"
import type { ReactNode } from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type DataTableColumn<TData> = {
  key: string
  header: ReactNode
  cell: (row: TData) => ReactNode
  className?: string
  headClassName?: string
}

type DataTableProps<TData> = {
  columns: DataTableColumn<TData>[]
  data: TData[]
  getRowKey: (row: TData) => string
  getRowHref?: (row: TData) => string | null
  getRowClassName?: (row: TData) => string | null | undefined
  emptyState: ReactNode
  className?: string
}

export function DataTable<TData>({
  columns,
  data,
  getRowKey,
  getRowHref,
  getRowClassName,
  emptyState,
  className,
}: DataTableProps<TData>) {
  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.key} className={column.headClassName}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length > 0 ? (
          data.map((row) => {
            const href = getRowHref?.(row) ?? null

            return (
              <TableRow
                key={getRowKey(row)}
                className={cn(
                  href ? "cursor-pointer" : undefined,
                  getRowClassName?.(row)
                )}
              >
                {columns.map((column) => {
                  const content = column.cell(row)

                  return (
                    <TableCell key={column.key} className={column.className}>
                      {href ? (
                        <Link
                          href={href}
                          className="block -m-3 rounded-xl p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                        >
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length} className="p-0">
              {emptyState}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

export type { DataTableColumn }
