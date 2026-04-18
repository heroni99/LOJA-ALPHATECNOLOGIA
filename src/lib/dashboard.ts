export type DashboardCashStatus = {
  open: boolean
  terminalName: string | null
  operatorName: string | null
  openedAt: string | null
}

export type DashboardTodaySnapshot = {
  totalValueCents: number
  totalCount: number
  averageTicketCents: number
  cancelledCount: number
  cashSessionOpen: boolean
}

export type DashboardSalesByHourPoint = {
  hour: number
  valueCents: number
  count: number
}

export type DashboardTopProduct = {
  productId: string
  name: string
  internalCode: string
  quantitySold: number
  totalValueCents: number
}

export type DashboardLowStockItem = {
  id: string
  name: string
  internalCode: string
  currentStock: number
  stockMin: number
}

export type DashboardServiceOrdersSummary = {
  open: number
  waitingApproval: number
  inProgress: number
  readyForDelivery: number
  total: number
}

export type DashboardSalesLast7DaysPoint = {
  date: string
  valueCents: number
  count: number
}

export function formatDashboardHour(hour: number) {
  return `${String(hour).padStart(2, "0")}h`
}
