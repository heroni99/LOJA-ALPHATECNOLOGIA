"use client"

import { useEffect, useState } from "react"

type InventoryBalanceApiResponse = {
  data?: Array<{
    id: string
    display_quantity: number
  }>
}

export function useProductLocationBalance(
  productId: string,
  locationId: string
) {
  const [quantity, setQuantity] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!productId || !locationId) {
      setQuantity(0)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)

    fetch(
      `/api/inventory?product_id=${encodeURIComponent(productId)}&location_id=${encodeURIComponent(locationId)}&limit=1`,
      {
        signal: controller.signal,
      }
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Não foi possível carregar o saldo atual.")
        }

        const data = (await response.json()) as InventoryBalanceApiResponse

        return data.data?.[0]?.display_quantity ?? 0
      })
      .then((value) => {
        setQuantity(value)
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }

        setQuantity(0)
      })
      .finally(() => {
        setIsLoading(false)
      })

    return () => controller.abort()
  }, [locationId, productId])

  return {
    quantity,
    isLoading,
  }
}
