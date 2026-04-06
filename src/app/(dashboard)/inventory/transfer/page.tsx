import { notFound } from "next/navigation"

import { InventoryTransferForm } from "@/components/inventory/inventory-transfer-form"
import { listStockLocations } from "@/lib/inventory-server"
import { getCurrentStoreContext } from "@/lib/products-server"

export default async function InventoryTransferPage() {
  const storeContext = await getCurrentStoreContext()

  if (!storeContext) {
    notFound()
  }

  const locations = await listStockLocations(storeContext.storeId)

  return (
    <InventoryTransferForm
      locations={locations.filter((location) => location.active)}
    />
  )
}
