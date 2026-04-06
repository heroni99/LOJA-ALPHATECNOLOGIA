"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Save } from "lucide-react"
import { type Control, useForm } from "react-hook-form"

import { FormPage } from "@/components/shared/form-page"
import { ImageUpload } from "@/components/shared/image-upload"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import {
  type ProductFormOption,
  type ProductFormValues,
  defaultProductFormValues,
  maskCurrencyInput,
  productFormSchema,
  toProductMutationInput,
} from "@/lib/products"

type ProductFormProps = {
  mode: "create" | "edit"
  categories: ProductFormOption[]
  suppliers: ProductFormOption[]
  initialValues?: ProductFormValues
  productId?: string
  internalCode?: string
  currentImageUrl?: string | null
}

type BooleanFieldProps = {
  control: Control<ProductFormValues>
  name: "is_service" | "has_serial_control" | "needs_price_review" | "active"
  label: string
  description: string
}

function BooleanField({
  control,
  name,
  label,
  description,
}: BooleanFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-start justify-between gap-4 rounded-3xl border border-border/70 bg-background/80 p-4">
          <div className="space-y-1">
            <FormLabel>{label}</FormLabel>
            <FormDescription>{description}</FormDescription>
          </div>
          <FormControl>
            <input
              type="checkbox"
              checked={field.value}
              onChange={(event) => field.onChange(event.target.checked)}
              className="mt-1 size-4 rounded border-border accent-primary"
            />
          </FormControl>
        </FormItem>
      )}
    />
  )
}

function CurrencyField({
  control,
  name,
  label,
  description,
}: {
  control: Control<ProductFormValues>
  name: "cost_price" | "sale_price"
  label: string
  description: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                R$
              </span>
              <Input
                value={field.value}
                inputMode="numeric"
                onChange={(event) => field.onChange(maskCurrencyInput(event.target.value))}
                className="pl-10"
              />
            </div>
          </FormControl>
          <FormDescription>{description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function ProductForm({
  mode,
  categories,
  suppliers,
  initialValues = defaultProductFormValues,
  productId,
  internalCode,
  currentImageUrl,
}: ProductFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [productImageUrl, setProductImageUrl] = useState(currentImageUrl ?? null)
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialValues,
  })

  async function handleSubmit(values: ProductFormValues) {
    try {
      setIsSaving(true)

      const payload = toProductMutationInput(values)
      const response = await fetch(
        mode === "create" ? "/api/products" : `/api/products/${productId}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      )
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(responseData?.error ?? "Não foi possível salvar o produto.")
      }

      toast.success(
        mode === "create"
          ? "Produto criado com sucesso."
          : "Produto atualizado com sucesso."
      )

      router.push(`/products/${responseData.data.id}`)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível salvar o produto."
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <FormPage
      title={mode === "create" ? "Novo produto" : "Editar produto"}
      description={
        mode === "create"
          ? "Cadastre um novo item do catálogo com identificação, preços, dados fiscais e regras operacionais."
          : "Atualize os dados do produto sem alterar o código interno gerado automaticamente pelo banco."
      }
      titleSlot={
        internalCode ? (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            {internalCode}
          </span>
        ) : null
      }
      footer={
        <>
          <Button variant="outline" asChild>
            <Link href={mode === "create" ? "/products" : `/products/${productId}`}>
              Cancelar
            </Link>
          </Button>
          <Button
            type="submit"
            form="product-form"
            disabled={isSaving}
          >
            <Save />
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form
          id="product-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="grid gap-6"
        >
          <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardHeader>
              <CardTitle>Imagem</CardTitle>
            </CardHeader>
            <CardContent>
              {productId ? (
                <ImageUpload
                  productId={productId}
                  currentUrl={productImageUrl ?? undefined}
                  onUpload={(url) => {
                    setProductImageUrl(url)
                    router.refresh()
                  }}
                  description="Envie a foto principal do produto. A URL pública será salva no cadastro."
                />
              ) : (
                <div className="rounded-3xl border border-dashed border-border/70 bg-muted/20 p-5 text-sm text-muted-foreground">
                  Salve o produto primeiro para gerar o identificador e então enviar a
                  imagem ao bucket `product-images`.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardHeader>
              <CardTitle>Identificação</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2 xl:col-span-3">
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: iPhone 15 128GB" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supplier_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor</FormLabel>
                    <Select
                      value={field.value || "none"}
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? "" : value)
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione o fornecedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sem fornecedor</SelectItem>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: Apple" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: A55 5G" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardHeader>
              <CardTitle>Preços</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <CurrencyField
                control={form.control}
                name="cost_price"
                label="Custo *"
                description="Informe o custo em reais; a API persiste o valor convertido em centavos."
              />
              <CurrencyField
                control={form.control}
                name="sale_price"
                label="Preço de venda *"
                description="Use o valor de venda em reais. O código interno continua somente leitura."
              />
            </CardContent>
          </Card>

          <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardHeader>
              <CardTitle>Fiscal</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField
                control={form.control}
                name="ncm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NCM</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: 85171231" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cest"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEST</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: 21.064.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cfop_default"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CFOP</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: 5102" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="origin_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origem</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: 0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="border border-border/70 bg-card/95 shadow-sm shadow-black/5">
            <CardHeader>
              <CardTitle>Configurações</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-2">
              <BooleanField
                control={form.control}
                name="is_service"
                label="É serviço"
                description="Produtos marcados como serviço não dependem de unidade física para venda."
              />
              <BooleanField
                control={form.control}
                name="has_serial_control"
                label="Controla série/IMEI"
                description="Ative quando cada unidade precisar de IMEI, serial ou rastreabilidade individual."
              />
              <BooleanField
                control={form.control}
                name="needs_price_review"
                label="Exige revisão de preço"
                description="Use esta flag para destacar itens com custo recente ou preço em revisão."
              />
              <BooleanField
                control={form.control}
                name="active"
                label="Ativo"
                description="Produtos inativos saem das listas operacionais, mas permanecem disponíveis para consulta."
              />
            </CardContent>
          </Card>
        </form>
      </Form>
    </FormPage>
  )
}
