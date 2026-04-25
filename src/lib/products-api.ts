import { ZodError } from "zod"

import type {
  ProductCode,
  ProductDetail,
  ProductMovement,
  ProductQuickSearchResult,
  ProductStockBalance,
  ProductSummary,
} from "@/lib/products"

export function getProductApiErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Dados inválidos."
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Não foi possível processar a requisição."
}

export function toProductSummaryDto(product: ProductSummary) {
  return {
    id: product.id,
    internal_code: product.internalCode,
    name: product.name,
    image_url: product.imageUrl,
    sale_price: product.salePriceCents,
    stock_total: product.stockTotal,
    stock_min: product.stockMin,
    is_below_min: product.isBelowMin,
    is_service: product.isService,
    active: product.active,
    category: {
      id: product.categoryId,
      name: product.categoryName,
    },
    supplier: product.supplierId
      ? {
          id: product.supplierId,
          name: product.supplierName,
        }
      : null,
  }
}

export function toProductCodeDto(code: ProductCode) {
  return {
    id: code.id,
    code: code.code,
    code_type: code.codeType,
    scope: code.scope,
    is_primary: code.isPrimary,
    created_at: code.createdAt,
  }
}

export function toProductStockBalanceDto(balance: ProductStockBalance) {
  return {
    id: balance.id,
    location_id: balance.locationId,
    location_name: balance.locationName,
    location_active: balance.locationActive,
    quantity: balance.quantity,
    updated_at: balance.updatedAt,
  }
}

export function toProductMovementDto(movement: ProductMovement) {
  return {
    id: movement.id,
    movement_type: movement.movementType,
    quantity: movement.quantity,
    unit_cost: movement.unitCostCents,
    reference_type: movement.referenceType,
    notes: movement.notes,
    location_name: movement.locationName,
    created_at: movement.createdAt,
  }
}

export function toProductQuickSearchDto(product: ProductQuickSearchResult) {
  return {
    id: product.id,
    name: product.name,
    internal_code: product.internalCode,
    sale_price: product.salePriceCents,
    has_serial_control: product.hasSerialControl,
    stock_total: product.stockTotal,
    image_url: product.imageUrl,
  }
}

export function toProductDetailDto(
  product: ProductDetail,
  extra?: {
    codes?: ProductCode[]
    stockBalances?: ProductStockBalance[]
    recentMovements?: ProductMovement[]
  }
) {
  return {
    id: product.id,
    internal_code: product.internalCode,
    name: product.name,
    image_url: product.imageUrl,
    description: product.description,
    brand: product.brand,
    model: product.model,
    supplier_code: product.supplierCode,
    ncm: product.ncm,
    cest: product.cest,
    cfop_default: product.cfopDefault,
    origin_code: product.originCode,
    tax_category: product.taxCategory,
    cost_price: product.costPriceCents,
    sale_price: product.salePriceCents,
    stock_min: product.stockMin,
    stock_total: product.stockTotal,
    has_serial_control: product.hasSerialControl,
    needs_price_review: product.needsPriceReview,
    is_service: product.isService,
    active: product.active,
    created_at: product.createdAt,
    updated_at: product.updatedAt,
    category: {
      id: product.categoryId,
      name: product.categoryName,
    },
    supplier: product.supplierId
      ? {
          id: product.supplierId,
          name: product.supplierName,
        }
      : null,
    codes: (extra?.codes ?? []).map(toProductCodeDto),
    stock_balances: (extra?.stockBalances ?? []).map(toProductStockBalanceDto),
    stock_movements: (extra?.recentMovements ?? []).map(toProductMovementDto),
  }
}
