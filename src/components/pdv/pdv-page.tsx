"use client"

import Image from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Banknote,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  Printer,
  QrCode,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react"

import { CustomerAutocomplete } from "@/components/pdv/customer-autocomplete"
import { PdvScannerPanel } from "@/components/pdv/pdv-scanner-panel"
import { MoneyInput } from "@/components/shared/money-input"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { createApiError, parseApiError, shouldRedirectToLogin } from "@/lib/api-error"
import {
  PDV_CART_STORAGE_KEY,
  buildPdvCartSummary,
  createPdvPaymentLine,
  defaultPdvDiscount,
  formatCentsToBRL,
  formatDateTime,
  getCartItemSubtotalCents,
  getPdvPaymentMethodLabel,
  getPdvPaymentMethods,
  getSuggestedPaymentAmountCents,
  toPdvCheckoutPayload,
  type PdvCartItem,
  type PdvCompletedSale,
  type PdvCustomerOption,
  type PdvDiscountInput,
  type PdvPaymentLine,
  type PdvSearchResult,
} from "@/lib/pdv"
import {
  fromPdvCompletedSaleDto,
  fromPdvSearchResultDto,
  type PdvCompletedSaleDto,
  type PdvSearchResultDto,
} from "@/lib/pdv-api"
import type { CashCurrentSession } from "@/lib/cash"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

type SearchApiResponse = {
  data?: PdvSearchResultDto[]
  error?: string
}

type CashSessionApiResponse = {
  data?: CashCurrentSession
  error?: string
}

type CheckoutApiResponse = {
  data?: PdvCompletedSaleDto
  error?: string
}

type FiscalGenerateApiResponse = {
  data?: {
    id: string
    receiptNumber: string
    status: "ISSUED" | "CANCELLED"
  }
  error?: string
}

type GeneratedFiscalReceipt = {
  id: string
  receiptNumber: string
}

function getPaymentMethodIcon(method: PdvPaymentLine["method"]) {
  switch (method) {
    case "CASH":
      return Banknote
    case "PIX":
      return QrCode
    case "DEBIT_CARD":
      return CreditCard
    case "CREDIT_CARD":
      return CreditCard
    default:
      return CreditCard
  }
}

function parseStoredCartItems(value: string | null) {
  if (!value) {
    return [] as PdvCartItem[]
  }

  try {
    const parsed = JSON.parse(value) as PdvCartItem[]

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter(
        (item) =>
          Boolean(item?.key) &&
          Boolean(item?.productId) &&
          typeof item?.quantity === "number" &&
          typeof item?.unitPriceCents === "number"
      )
      .map((item) => ({
        ...item,
        imageUrl: item.imageUrl ?? null,
        category: item.category ?? null,
        imeiOrSerial: item.imeiOrSerial ?? null,
        productUnitId: item.productUnitId ?? null,
        availableQuantity:
          typeof item.availableQuantity === "number" ? item.availableQuantity : 0,
      }))
  } catch {
    return []
  }
}

function ProductThumb({
  imageUrl,
  alt,
}: {
  imageUrl: string | null
  alt: string
}) {
  return (
    <div className="relative size-14 overflow-hidden rounded-2xl border border-border/70 bg-muted/40">
      {imageUrl ? (
        <Image src={imageUrl} alt={alt} fill className="object-cover" sizes="56px" />
      ) : (
        <div className="flex size-full items-center justify-center bg-muted text-xs font-medium text-muted-foreground">
          IMG
        </div>
      )}
    </div>
  )
}

export function PdvPage() {
  const router = useRouter()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const cartItemsRef = useRef<PdvCartItem[]>([])
  const [session, setSession] = useState<CashCurrentSession | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<PdvSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [cartItems, setCartItems] = useState<PdvCartItem[]>([])
  const [discount, setDiscount] = useState<PdvDiscountInput>(defaultPdvDiscount)
  const [selectedCustomer, setSelectedCustomer] = useState<PdvCustomerOption | null>(
    null
  )
  const [paymentLines, setPaymentLines] = useState<PdvPaymentLine[]>([])
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false)
  const [completedSale, setCompletedSale] = useState<PdvCompletedSale | null>(null)
  const [generatedFiscalReceipt, setGeneratedFiscalReceipt] =
    useState<GeneratedFiscalReceipt | null>(null)
  const [isGeneratingFiscalReceipt, setIsGeneratingFiscalReceipt] = useState(false)
  const [recentlyAddedKey, setRecentlyAddedKey] = useState<string | null>(null)
  const completedSaleId = completedSale?.id ?? null

  cartItemsRef.current = cartItems

  const summary = useMemo(
    () => buildPdvCartSummary(cartItems, paymentLines, discount),
    [cartItems, paymentLines, discount]
  )

  useEffect(() => {
    setCartItems(parseStoredCartItems(sessionStorage.getItem(PDV_CART_STORAGE_KEY)))
    searchInputRef.current?.focus()
  }, [router])

  useEffect(() => {
    if (cartItems.length > 0) {
      sessionStorage.setItem(PDV_CART_STORAGE_KEY, JSON.stringify(cartItems))
      return
    }

    sessionStorage.removeItem(PDV_CART_STORAGE_KEY)
  }, [cartItems])

  useEffect(() => {
    if (!recentlyAddedKey) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setRecentlyAddedKey(null)
    }, 320)

    return () => window.clearTimeout(timeoutId)
  }, [recentlyAddedKey])

  useEffect(() => {
    const controller = new AbortController()

    setIsLoadingSession(true)
    fetch("/api/cash/current-session", { signal: controller.signal })
      .then(async (response) => {
        const responseData = (await response.json()) as CashSessionApiResponse

        if (!response.ok || !responseData.data) {
          throw createApiError(
            response.status,
            responseData.error ?? "Não foi possível carregar a sessão do caixa."
          )
        }

        setSession(responseData.data)
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }

        toast.error(parseApiError(error))

        if (shouldRedirectToLogin(error)) {
          router.replace("/login")
          router.refresh()
        }
      })
      .finally(() => {
        setIsLoadingSession(false)
      })

    return () => controller.abort()
  }, [router])

  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      if (event.key === "F2") {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    window.addEventListener("keydown", handleKeyboardShortcut)

    return () => window.removeEventListener("keydown", handleKeyboardShortcut)
  }, [])

  useEffect(() => {
    if (!completedSaleId) {
      setGeneratedFiscalReceipt(null)
      setIsGeneratingFiscalReceipt(false)
      return
    }

    const controller = new AbortController()
    let isActive = true

    setGeneratedFiscalReceipt(null)
    setIsGeneratingFiscalReceipt(true)

    fetch("/api/fiscal/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sale_id: completedSaleId }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const responseData = (await response.json()) as FiscalGenerateApiResponse

        if (!response.ok || !responseData.data) {
          throw createApiError(
            response.status,
            responseData.error ?? "Não foi possível gerar o comprovante."
          )
        }

        if (isActive) {
          setGeneratedFiscalReceipt({
            id: responseData.data.id,
            receiptNumber: responseData.data.receiptNumber,
          })
        }
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }

        if (isActive) {
          toast.warning(
            "Venda concluída, mas o comprovante interno não pôde ser gerado agora."
          )
        }

        if (shouldRedirectToLogin(error)) {
          router.replace("/login")
          router.refresh()
        }
      })
      .finally(() => {
        if (isActive) {
          setIsGeneratingFiscalReceipt(false)
        }
      })

    return () => {
      isActive = false
      controller.abort()
    }
  }, [completedSaleId, router])

  useEffect(() => {
    const query = search.trim()

    if (query.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      setIsSearching(true)
      fetch(`/api/pdv/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const responseData = (await response.json()) as SearchApiResponse

          if (!response.ok) {
            throw createApiError(
              response.status,
              responseData.error ?? "Não foi possível buscar itens no PDV."
            )
          }

          setSearchResults((responseData.data ?? []).map(fromPdvSearchResultDto))
          setIsSearchOpen(true)
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return
          }

          setSearchResults([])
          toast.error(parseApiError(error))

          if (shouldRedirectToLogin(error)) {
            router.replace("/login")
            router.refresh()
          }
        })
        .finally(() => {
          setIsSearching(false)
        })
    }, 300)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [router, search])

  function focusSearchInput() {
    window.setTimeout(() => {
      searchInputRef.current?.focus()
    }, 40)
  }

  function clearSearch() {
    setSearch("")
    setSearchResults([])
    setIsSearchOpen(false)
  }

  function addResultToCart(result: PdvSearchResult) {
    const currentItems = cartItemsRef.current

    if (result.kind === "unit" && result.productUnitId) {
      const alreadyAdded = currentItems.some(
        (item) => item.productUnitId === result.productUnitId
      )

      if (alreadyAdded) {
        toast.error("Essa unidade já está no carrinho.")
        return false
      }

      setCartItems([
        ...currentItems,
        {
          key: result.key,
          productId: result.productId,
          productUnitId: result.productUnitId,
          internalCode: result.internalCode,
          name: result.name,
          quantity: 1,
          unitPriceCents: result.salePriceCents,
          hasSerialControl: true,
          imeiOrSerial: result.imeiOrSerial,
          availableQuantity: 1,
          imageUrl: result.imageUrl,
          category: result.category,
        },
      ])
    } else {
      const existingItem = currentItems.find(
        (item) => item.productId === result.productId && !item.productUnitId
      )

      if (existingItem) {
        if (existingItem.quantity + 1 > result.availableQuantity) {
          toast.error("Estoque indisponível para aumentar a quantidade.")
          return false
        }

        setCartItems(
          currentItems.map((item) =>
            item.key === existingItem.key
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        )
      } else {
        setCartItems([
          ...currentItems,
          {
            key: result.key,
            productId: result.productId,
            productUnitId: null,
            internalCode: result.internalCode,
            name: result.name,
            quantity: 1,
            unitPriceCents: result.salePriceCents,
            hasSerialControl: false,
            imeiOrSerial: null,
            availableQuantity: result.availableQuantity,
            imageUrl: result.imageUrl,
            category: result.category,
          },
        ])
      }
    }

    setRecentlyAddedKey(result.kind === "unit" && result.productUnitId ? `unit:${result.productUnitId}` : `product:${result.productId}`)
    clearSearch()
    focusSearchInput()
    return true
  }

  function updateItemQuantity(itemKey: string, nextQuantity: number) {
    setCartItems((current) =>
      current.map((item) => {
        if (item.key !== itemKey || item.hasSerialControl) {
          return item
        }

        const safeQuantity = Math.min(
          Math.max(nextQuantity, 1),
          Math.max(1, Math.floor(item.availableQuantity))
        )

        return {
          ...item,
          quantity: safeQuantity,
        }
      })
    )
  }

  function removeCartItem(itemKey: string) {
    setCartItems((current) => current.filter((item) => item.key !== itemKey))
  }

  function addPaymentMethod(method: PdvPaymentLine["method"]) {
    const alreadyExists = paymentLines.some((payment) => payment.method === method)

    if (alreadyExists) {
      toast.error("Essa forma de pagamento já foi adicionada.")
      return
    }

    const suggestedAmount = getSuggestedPaymentAmountCents(summary)
    setPaymentLines((current) => [
      ...current,
      createPdvPaymentLine(method, suggestedAmount),
    ])
  }

  function updatePaymentLineAmount(paymentId: string, amountCents: number) {
    setPaymentLines((current) =>
      current.map((payment) =>
        payment.id === paymentId
          ? { ...payment, amountCents }
          : payment
      )
    )
  }

  function removePaymentLine(paymentId: string) {
    setPaymentLines((current) =>
      current.filter((payment) => payment.id !== paymentId)
    )
  }

  function startNewSale() {
    setCompletedSale(null)
    setGeneratedFiscalReceipt(null)
    setIsGeneratingFiscalReceipt(false)
    setIsConfirmOpen(false)
    setCartItems([])
    setSelectedCustomer(null)
    setPaymentLines([])
    setDiscount(defaultPdvDiscount)
    clearSearch()
    focusSearchInput()
  }

  async function handleCheckout() {
    try {
      setIsSubmittingCheckout(true)
      const payload = toPdvCheckoutPayload(
        cartItems,
        paymentLines,
        discount,
        selectedCustomer?.id ?? null
      )
      const response = await fetch("/api/sales/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      const responseData = (await response.json()) as CheckoutApiResponse

      if (!response.ok || !responseData.data) {
        throw createApiError(
          response.status,
          responseData.error ?? "Não foi possível concluir a venda."
        )
      }

      setCompletedSale(fromPdvCompletedSaleDto(responseData.data))
      setIsConfirmOpen(false)
      setCartItems([])
      setSelectedCustomer(null)
      setPaymentLines([])
      setDiscount(defaultPdvDiscount)
      clearSearch()
    } catch (error) {
      toast.error(parseApiError(error))

      if (shouldRedirectToLogin(error)) {
        router.replace("/login")
        router.refresh()
      }
    } finally {
      setIsSubmittingCheckout(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="PDV"
        titleSlot={
          <>
            <Badge variant="outline" className="border-primary/20 text-primary">
              {isLoadingSession ? "Carregando caixa..." : session?.terminalName ?? "Caixa automático"}
            </Badge>
            {session ? (
              <>
                <Badge variant="outline">Operador: {session.operatorName}</Badge>
                <Badge variant="outline">
                  Abertura: {formatDateTime(session.openedAt)}
                </Badge>
              </>
            ) : null}
            <Badge variant="outline">F2 busca rápida</Badge>
          </>
        }
        description="Venda de balcão com busca rápida, carrinho persistido e checkout em múltiplas formas de pagamento."
      />

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)]">
        <SectionCard
          title="Busca e carrinho"
          description="Pesquise por nome, código, barcode ou IMEI e monte a venda sem perder o estado atual."
          className="min-w-0"
        >
          <div className="grid gap-6">
            <div
              className="relative"
              onBlur={() => {
                window.setTimeout(() => setIsSearchOpen(false), 120)
              }}
            >
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={search}
                placeholder="Nome, código, barcode ou IMEI..."
                className="h-14 rounded-3xl pl-12 pr-4 text-base"
                onFocus={() => {
                  if (searchResults.length > 0) {
                    setIsSearchOpen(true)
                  }
                }}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setIsSearchOpen(true)
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && searchResults.length > 0) {
                    event.preventDefault()
                    addResultToCart(searchResults[0])
                  }

                  if (event.key === "Escape") {
                    clearSearch()
                  }
                }}
              />

              {isSearchOpen &&
              (isSearching || searchResults.length > 0 || search.trim().length >= 2) ? (
                <div className="absolute z-20 mt-3 w-full overflow-hidden rounded-3xl border border-border bg-popover shadow-lg ring-1 ring-foreground/5">
                  {isSearching ? (
                    <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Buscando itens...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto p-2">
                      {searchResults.map((result) => (
                        <button
                          key={result.key}
                          type="button"
                          className="flex w-full items-start gap-4 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                          onMouseDown={(event) => {
                            event.preventDefault()
                            addResultToCart(result)
                          }}
                        >
                          <ProductThumb imageUrl={result.imageUrl} alt={result.name} />

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-foreground">
                                {result.name}
                              </span>
                              <Badge variant="outline">{result.internalCode}</Badge>
                              {result.imeiOrSerial ? (
                                <Badge variant="outline" className="border-primary/20 text-primary">
                                  {result.imeiOrSerial}
                                </Badge>
                              ) : null}
                            </div>

                            <p className="truncate text-sm text-muted-foreground">
                              {result.category?.name ?? "Sem categoria"}
                            </p>
                          </div>

                          <div className="shrink-0 text-right text-sm">
                            <p className="font-medium text-foreground">
                              {formatCentsToBRL(result.salePriceCents)}
                            </p>
                            <p className="text-muted-foreground">
                              {result.kind === "unit"
                                ? "1 unidade"
                                : `${result.availableQuantity.toLocaleString("pt-BR")} em estoque`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-4 text-sm text-muted-foreground">
                      Nenhum item encontrado.
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <PdvScannerPanel onProductScanned={addResultToCart} />

            <div className="grid gap-3">
              {cartItems.length > 0 ? (
                cartItems.map((item) => (
                  <div
                    key={item.key}
                    className={cn(
                      "flex flex-col gap-4 rounded-3xl border border-border/70 bg-background p-4 md:flex-row md:items-center md:justify-between",
                      recentlyAddedKey === item.key &&
                        "animate-in slide-in-from-top-4 fade-in-0 duration-300"
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      <ProductThumb imageUrl={item.imageUrl} alt={item.name} />

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">
                            {item.name}
                          </span>
                          <Badge variant="outline">{item.internalCode}</Badge>
                          {item.category ? (
                            <Badge variant="outline">{item.category.name}</Badge>
                          ) : null}
                          {item.imeiOrSerial ? (
                            <Badge variant="outline" className="border-primary/20 text-primary">
                              {item.imeiOrSerial}
                            </Badge>
                          ) : null}
                        </div>

                        <p className="text-sm text-muted-foreground">
                          {formatCentsToBRL(item.unitPriceCents)} por unidade
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 md:justify-end">
                      {item.hasSerialControl ? (
                        <Badge>Quantidade fixa: 1</Badge>
                      ) : (
                        <div className="flex items-center gap-2 rounded-full border border-border px-2 py-1">
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() =>
                              updateItemQuantity(item.key, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                          >
                            <Minus />
                          </Button>
                          <span className="min-w-8 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() =>
                              updateItemQuantity(item.key, item.quantity + 1)
                            }
                            disabled={item.quantity >= item.availableQuantity}
                          >
                            <Plus />
                          </Button>
                        </div>
                      )}

                      <div className="min-w-28 text-right">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          Subtotal
                        </p>
                        <p className="font-semibold text-foreground">
                          {formatCentsToBRL(getCartItemSubtotalCents(item))}
                        </p>
                      </div>

                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => removeCartItem(item.key)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={ShoppingCart}
                  title="Carrinho vazio"
                  description="Busque um produto acima"
                  className="min-h-72"
                />
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Resumo e pagamento"
          description="Aplique desconto, selecione cliente e confirme os recebimentos antes de concluir a venda."
          className="min-w-0"
        >
          <div className="grid gap-6">
            <div className="space-y-3 rounded-3xl border border-border/70 bg-background p-4">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <strong>{formatCentsToBRL(summary.subtotalCents)}</strong>
              </div>

              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={discount.mode === "amount" ? "default" : "outline"}
                    className="w-full"
                    onClick={() =>
                      setDiscount({
                        mode: "amount",
                        valueCents: 0,
                      })
                    }
                  >
                    Desconto em R$
                  </Button>
                  <Button
                    type="button"
                    variant={discount.mode === "percent" ? "default" : "outline"}
                    className="w-full"
                    onClick={() =>
                      setDiscount({
                        mode: "percent",
                        value: "0",
                      })
                    }
                  >
                    Desconto %
                  </Button>
                </div>

                {discount.mode === "amount" ? (
                  <MoneyInput
                    value={discount.valueCents}
                    onChange={(value) =>
                      setDiscount({
                        mode: "amount",
                        valueCents: value,
                      })
                    }
                    placeholder="0,00"
                  />
                ) : (
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={discount.value}
                    onChange={(event) =>
                      setDiscount({
                        mode: "percent",
                        value: event.target.value,
                      })
                    }
                  />
                )}
              </div>

              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Desconto aplicado</span>
                <strong>{formatCentsToBRL(summary.discountAmountCents)}</strong>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-3xl bg-orange-500/10 px-4 py-4">
                <span className="text-sm font-medium text-orange-700">TOTAL</span>
                <strong className="text-3xl font-semibold text-orange-700">
                  {formatCentsToBRL(summary.totalCents)}
                </strong>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">Cliente</p>
                {selectedCustomer ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    <X />
                  </Button>
                ) : null}
              </div>
              <CustomerAutocomplete
                value={selectedCustomer}
                onChange={setSelectedCustomer}
              />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                Formas de pagamento
              </p>
              <div className="grid grid-cols-2 gap-2">
                {getPdvPaymentMethods().map(({ method, label }) => {
                  const Icon = getPaymentMethodIcon(method)
                  const active = paymentLines.some((payment) => payment.method === method)

                  return (
                    <Button
                      key={method}
                      type="button"
                      variant={active ? "default" : "outline"}
                      className="h-20 flex-col gap-2 rounded-3xl"
                      onClick={() => addPaymentMethod(method)}
                    >
                      <Icon className="size-5" />
                      {label}
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-3">
              {paymentLines.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-3xl border border-border/70 bg-background p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <Badge variant="outline">
                      {getPdvPaymentMethodLabel(payment.method)}
                    </Badge>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => removePaymentLine(payment.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>

                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {payment.method === "CASH" ? "Valor recebido" : "Valor"}
                  </label>
                  <MoneyInput
                    value={payment.amountCents}
                    onChange={(value) => updatePaymentLineAmount(payment.id, value)}
                    placeholder="0,00"
                  />

                  {payment.method === "CASH" ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Troco: <strong>{formatCentsToBRL(summary.changeCents)}</strong>
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-border/70 bg-background p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Recebido</span>
                <strong>{formatCentsToBRL(summary.totalPaidCents)}</strong>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Faltante</span>
                <strong>{formatCentsToBRL(summary.remainingCents)}</strong>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Troco</span>
                <strong>{formatCentsToBRL(summary.changeCents)}</strong>
              </div>
              {summary.paymentError ? (
                <p className="mt-3 text-sm text-red-600">{summary.paymentError}</p>
              ) : null}
            </div>

            <Button
              className="h-14 w-full rounded-3xl bg-orange-500 text-base text-white hover:bg-orange-600"
              disabled={!summary.isPaymentValid || isSubmittingCheckout}
              onClick={() => setIsConfirmOpen(true)}
            >
              {isSubmittingCheckout ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ShoppingCart />
              )}
              Finalizar venda
            </Button>
          </div>
        </SectionCard>
      </div>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar venda</DialogTitle>
            <DialogDescription>
              Revise os itens, o total e os pagamentos antes de concluir.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-3 rounded-3xl border border-border/70 bg-background p-4">
              {cartItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-muted-foreground">
                      {item.quantity} x {item.internalCode}
                      {item.imeiOrSerial ? ` • ${item.imeiOrSerial}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <strong>{formatCentsToBRL(getCartItemSubtotalCents(item))}</strong>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 rounded-3xl border border-border/70 bg-background p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Subtotal</span>
                <strong>{formatCentsToBRL(summary.subtotalCents)}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Desconto</span>
                <strong>{formatCentsToBRL(summary.discountAmountCents)}</strong>
              </div>
              <div className="flex items-center justify-between gap-3 text-base">
                <span className="font-medium text-foreground">Total</span>
                <strong>{formatCentsToBRL(summary.totalCents)}</strong>
              </div>
            </div>

            <div className="space-y-2 rounded-3xl border border-border/70 bg-background p-4 text-sm">
              {summary.appliedPayments.length > 0 ? (
                summary.appliedPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-muted-foreground">
                      {getPdvPaymentMethodLabel(payment.method)}
                    </span>
                    <div className="text-right">
                      <strong>{formatCentsToBRL(payment.enteredAmountCents)}</strong>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">Sem pagamentos lançados.</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isSubmittingCheckout}
              onClick={handleCheckout}
            >
              {isSubmittingCheckout ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ShoppingCart />
              )}
              Confirmar venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(completedSale)}
        onOpenChange={(open) => {
          if (!open) {
            setCompletedSale(null)
            focusSearchInput()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Venda concluída</DialogTitle>
            <DialogDescription>
              A venda foi registrada com sucesso no PDV.
            </DialogDescription>
          </DialogHeader>

          {completedSale ? (
            <div className="grid gap-4">
              <div className="rounded-3xl bg-orange-500/10 px-4 py-5 text-center">
                <p className="text-sm text-orange-700/80">Número da venda</p>
                <strong className="text-3xl font-semibold text-orange-700">
                  {completedSale.saleNumber}
                </strong>
              </div>

              <div className="space-y-2 rounded-3xl border border-border/70 bg-background p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Total</span>
                  <strong>{formatCentsToBRL(completedSale.totalCents)}</strong>
                </div>
                {completedSale.changeCents > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Troco</span>
                    <strong>{formatCentsToBRL(completedSale.changeCents)}</strong>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2 rounded-3xl border border-border/70 bg-background p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Comprovante</span>
                  {generatedFiscalReceipt ? (
                    <strong>{generatedFiscalReceipt.receiptNumber}</strong>
                  ) : isGeneratingFiscalReceipt ? (
                    <span className="inline-flex items-center gap-2 font-medium text-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Gerando...
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Indisponível</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  O comprovante fiscal interno é gerado em segundo plano após o checkout.
                </p>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={!generatedFiscalReceipt}
              onClick={() => {
                if (!generatedFiscalReceipt) {
                  return
                }

                window.open(
                  `/api/fiscal/${generatedFiscalReceipt.id}/receipt`,
                  "_blank",
                  "noopener,noreferrer"
                )
              }}
            >
              {isGeneratingFiscalReceipt ? <Loader2 className="animate-spin" /> : <Printer />}
              Imprimir comprovante
            </Button>
            <Button type="button" onClick={startNewSale}>
              Nova venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
