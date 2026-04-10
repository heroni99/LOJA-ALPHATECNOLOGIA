import { ZodError } from "zod"

import type {
  InventoryBalanceRow,
  InventoryLocationBalance,
  InventoryLocationOption,
  InventoryMovement,
  InventoryStockBalanceSnapshot,
} from "@/lib/inventory"

export function getInventoryApiErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Dados inválidos."
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível processar a requisição."
}

export function toInventoryLocationBalanceDto(balance: InventoryLocationBalance) {
  return {
    location_id: balance.locationId,
    location_name: balance.locationName,
    quantity: balance.quantity,
  }
}

export function toInventoryBalanceRowDto(row: InventoryBalanceRow) {
  return {
    id: row.id,
    internal_code: row.internalCode,
    name: row.productName,
    stock_min: row.stockMin,
    total_quantity: row.totalQuantity,
    display_quantity: row.displayQuantity,
    low_stock: row.isBelowMin,
    category: row.categoryId
      ? {
          id: row.categoryId,
          name: row.categoryName,
        }
      : null,
    location_balances: row.locationBalances.map(toInventoryLocationBalanceDto),
  }
}

export function toInventoryMovementDto(movement: InventoryMovement) {
  return {
    id: movement.id,
    created_at: movement.createdAt,
    movement_type: movement.movementType,
    quantity: movement.quantity,
    unit_cost: movement.unitCostCents,
    reference_type: movement.referenceType,
    notes: movement.notes,
    product: {
      id: movement.productId,
      name: movement.productName,
      internal_code: movement.internalCode,
    },
    location: {
      id: movement.locationId,
      name: movement.locationName,
    },
    user: movement.userName
      ? {
          name: movement.userName,
        }
      : null,
  }
}

export function toInventoryLocationDto(location: InventoryLocationOption) {
  return {
    id: location.id,
    name: location.name,
    description: location.description,
    is_default: location.isDefault,
    active: location.active,
  }
}

export function toInventoryStockBalanceDto(balance: InventoryStockBalanceSnapshot) {
  return {
    id: balance.id,
    product_id: balance.productId,
    location_id: balance.locationId,
    quantity: balance.quantity,
    updated_at: balance.updatedAt,
  }
}
