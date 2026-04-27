"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  BadgeCheck,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Shield,
  SlidersHorizontal,
  Tags,
  Users2,
} from "lucide-react"
import { Controller, useForm } from "react-hook-form"

import { ImageUpload } from "@/components/shared/image-upload"
import { LoadingButton } from "@/components/shared/loading-button"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createApiError, parseApiError, shouldRedirectToLogin } from "@/lib/api-error"
import {
  PRODUCT_IMAGES_BUCKET,
  PRODUCT_IMAGE_ACCEPTED_TYPES,
  PRODUCT_IMAGE_MAX_SIZE_BYTES,
} from "@/lib/storage"
import {
  SETTINGS_PRIMARY_COLOR_FALLBACK,
  categoryFormSchema,
  defaultStoreCategoryFormValues,
  defaultStoreSettingsFormValues,
  storeSettingsFormSchema,
  storeUserUpdateSchema,
  toStoreCategoryCreateInput,
  toStoreCategoryFormValues,
  toStoreCategoryUpdateInput,
  toStoreSettingsFormValues,
  toStoreSettingsMutationInput,
  type StoreCategoryFormValues,
  type StoreCategorySummary,
  type StoreRoleOption,
  type StoreSettings,
  type StoreSettingsFormValues,
  type StoreUserSummary,
  type StoreUserUpdateInput,
} from "@/lib/settings"
import { toast } from "@/lib/toast"

type StoreSettingsResponse = {
  data: StoreSettings
}

type StoreUsersResponse = {
  data: StoreUserSummary[]
  roles: StoreRoleOption[]
  currentUserId: string
}

type StoreCategoriesResponse = {
  data: StoreCategorySummary[]
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return "AT"
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

function withAlpha(hexColor: string, alphaHex: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(hexColor)
    ? `${hexColor}${alphaHex}`
    : SETTINGS_PRIMARY_COLOR_FALLBACK
}

function getContrastTextColor(hexColor: string) {
  const normalized = hexColor.replace("#", "")

  if (normalized.length !== 6) {
    return "#FFFFFF"
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255

  return luminance > 0.62 ? "#111827" : "#FFFFFF"
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
  })
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw createApiError(response.status, body?.error ?? "Erro ao carregar dados.")
  }

  return body as T
}

function SettingsSectionError({
  title,
  onRetry,
}: {
  title: string
  onRetry: () => Promise<unknown>
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-4 rounded-3xl border border-red-200 bg-red-50/70 p-6 text-center">
      <div className="space-y-1">
        <p className="font-medium text-red-700">{title}</p>
        <p className="text-sm text-red-600">
          Tente novamente para recarregar esta seção.
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => void onRetry()}>
        <RefreshCw />
        Tentar novamente
      </Button>
    </div>
  )
}

function SettingsTableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-3xl border border-border/70">
      <div className="grid gap-3 p-4">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="grid gap-3 md:grid-cols-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ))}
      </div>
    </div>
  )
}

function PrimaryColorField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const normalizedValue = /^#[0-9A-Fa-f]{6}$/.test(value)
    ? value
    : SETTINGS_PRIMARY_COLOR_FALLBACK

  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={normalizedValue}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        className="h-11 w-16 cursor-pointer rounded-2xl border border-border bg-background p-1"
        aria-label="Selecionar cor principal"
      />
      <Input
        value={value}
        placeholder="#F97316"
        onChange={(event) => onChange(event.target.value.toUpperCase())}
      />
    </div>
  )
}

function CategoryDialog({
  mode,
  category,
  onSaved,
}: {
  mode: "create" | "edit"
  category?: StoreCategorySummary
  onSaved: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const form = useForm<StoreCategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues:
      mode === "edit" && category
        ? toStoreCategoryFormValues(category)
        : defaultStoreCategoryFormValues,
  })

  useEffect(() => {
    if (!open) {
      form.reset(
        mode === "edit" && category
          ? toStoreCategoryFormValues(category)
          : defaultStoreCategoryFormValues
      )
    }
  }, [category, form, mode, open])

  async function handleSubmit(values: StoreCategoryFormValues) {
    try {
      setIsSaving(true)

      const response = await fetch(
        mode === "create"
          ? "/api/settings/categories"
          : `/api/settings/categories/${category?.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            mode === "create"
              ? toStoreCategoryCreateInput(values)
              : toStoreCategoryUpdateInput(values)
          ),
        }
      )
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw createApiError(
          response.status,
          responseData?.error ??
            (mode === "create"
              ? "Não foi possível criar a categoria."
              : "Não foi possível atualizar a categoria.")
        )
      }

      toast.success(
        mode === "create"
          ? "Categoria criada com sucesso."
          : "Categoria atualizada com sucesso."
      )
      setOpen(false)
      onSaved()
    } catch (error) {
      toast.error(parseApiError(error))

      if (shouldRedirectToLogin(error)) {
        router.replace("/login")
        router.refresh()
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button type="button">
            <Plus />
            Nova categoria
          </Button>
        ) : (
          <Button type="button" variant="outline" size="xs">
            <Pencil />
            Editar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nova categoria" : "Editar categoria"}
          </DialogTitle>
          <DialogDescription>
            Defina o nome, o prefixo do código interno e se os produtos dessa categoria
            devem iniciar com controle por IMEI/serial.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id={`category-${mode}-form${category ? `-${category.id}` : ""}`}
            onSubmit={form.handleSubmit(handleSubmit)}
            className="grid gap-4"
          >
            <fieldset disabled={isSaving} className="grid gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: Smartphones" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prefixo *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex.: CEL"
                        value={field.value}
                        onChange={(event) =>
                          field.onChange(event.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Usado na geração automática do código interno dos produtos.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultSerialized"
                render={({ field }) => (
                  <FormItem className="flex items-start justify-between gap-4 rounded-3xl border border-border/70 bg-background/70 p-4">
                    <div className="space-y-1">
                      <FormLabel>IMEI/Serial por padrão</FormLabel>
                      <FormDescription>
                        Novos produtos desta categoria já iniciam com controle serial ativo.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={field.value}
                        onClick={() => field.onChange(!field.value)}
                        className={[
                          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors",
                          field.value
                            ? "border-primary bg-primary"
                            : "border-border bg-muted",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "inline-block size-5 rounded-full bg-white transition-transform",
                            field.value ? "translate-x-6" : "translate-x-1",
                          ].join(" ")}
                        />
                      </button>
                    </FormControl>
                  </FormItem>
                )}
              />
            </fieldset>
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <LoadingButton
            type="submit"
            form={`category-${mode}-form${category ? `-${category.id}` : ""}`}
            isLoading={isSaving}
            loadingLabel={mode === "create" ? "Criando..." : "Salvando..."}
          >
            {mode === "create" ? "Criar categoria" : "Salvar alterações"}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StoreUserRow({
  user,
  roles,
  currentUserId,
  onSaved,
}: {
  user: StoreUserSummary
  roles: StoreRoleOption[]
  currentUserId: string
  onSaved: (shouldRefreshLayout: boolean) => void
}) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const isCurrentUser = user.id === currentUserId
  const form = useForm<StoreUserUpdateInput>({
    resolver: zodResolver(storeUserUpdateSchema),
    defaultValues: {
      roleId: user.roleId,
      active: user.active,
    },
  })

  useEffect(() => {
    form.reset({
      roleId: user.roleId,
      active: user.active,
    })
  }, [form, user])

  const isActive = form.watch("active")

  async function handleSubmit(values: StoreUserUpdateInput) {
    try {
      setIsSaving(true)

      const response = await fetch(`/api/settings/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw createApiError(
          response.status,
          responseData?.error ?? "Não foi possível atualizar o usuário."
        )
      }

      toast.success("Usuário atualizado com sucesso.")
      form.reset({
        roleId: responseData.data.roleId,
        active: responseData.data.active,
      })
      onSaved(isCurrentUser)
    } catch (error) {
      toast.error(parseApiError(error))

      if (shouldRedirectToLogin(error)) {
        router.replace("/login")
        router.refresh()
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <TableRow>
      <TableCell className="whitespace-normal">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{user.name}</span>
            {isCurrentUser ? (
              <Badge variant="outline" className="border-primary/20 text-primary">
                Você
              </Badge>
            ) : null}
          </div>
          <span className="text-sm text-muted-foreground">
            {user.email ?? "E-mail não disponível"}
          </span>
        </div>
      </TableCell>
      <TableCell className="min-w-[220px]">
        <Controller
          name="roleId"
          control={form.control}
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value)
                  field.onBlur()
                }}
              >
                <SelectTrigger
                  className="w-full"
                  aria-invalid={fieldState.invalid}
                  onBlur={field.onBlur}
                >
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.error ? (
                <p className="text-sm font-medium text-destructive">
                  {fieldState.error.message}
                </p>
              ) : null}
            </div>
          )}
        />
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={
            isActive
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-zinc-200 bg-zinc-100 text-zinc-700"
          }
        >
          {isActive ? "Ativo" : "Inativo"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={isSaving || isCurrentUser}
            onClick={() =>
              form.setValue("active", !isActive, {
                shouldDirty: true,
                shouldTouch: true,
              })
            }
          >
            <Power />
            {isCurrentUser ? "Seu usuário" : isActive ? "Desativar" : "Ativar"}
          </Button>
          <LoadingButton
            type="button"
            size="xs"
            isLoading={isSaving}
            loadingLabel="Salvando..."
            disabled={!form.formState.isDirty}
            onClick={() => void form.handleSubmit(handleSubmit)()}
          >
            <Shield />
            Salvar
          </LoadingButton>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function SettingsClientPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isSavingStore, setIsSavingStore] = useState(false)
  const [categoryToggleId, setCategoryToggleId] = useState<string | null>(null)
  const storeForm = useForm<StoreSettingsFormValues>({
    resolver: zodResolver(storeSettingsFormSchema),
    defaultValues: defaultStoreSettingsFormValues,
  })

  const storeQuery = useQuery({
    queryKey: ["settings", "store"],
    queryFn: () => fetchJson<StoreSettingsResponse>("/api/settings/store"),
  })

  const usersQuery = useQuery({
    queryKey: ["settings", "users"],
    queryFn: () => fetchJson<StoreUsersResponse>("/api/settings/users"),
  })

  const categoriesQuery = useQuery({
    queryKey: ["settings", "categories"],
    queryFn: () =>
      fetchJson<StoreCategoriesResponse>("/api/settings/categories"),
  })

  const store = storeQuery.data?.data ?? null
  const users = usersQuery.data?.data ?? []
  const roles = usersQuery.data?.roles ?? []
  const currentUserId = usersQuery.data?.currentUserId ?? ""
  const categories = categoriesQuery.data?.data ?? []

  useEffect(() => {
    if (store) {
      storeForm.reset(toStoreSettingsFormValues(store))
    }
  }, [store, storeForm])

  const watchedName = storeForm.watch("name")
  const watchedDisplayName = storeForm.watch("displayName")
  const watchedCode = storeForm.watch("code")
  const watchedPrimaryColor = storeForm.watch("primaryColor")
  const watchedLogoUrl = storeForm.watch("logoUrl")
  const previewColor = /^#[0-9A-Fa-f]{6}$/.test(watchedPrimaryColor)
    ? watchedPrimaryColor.toUpperCase()
    : SETTINGS_PRIMARY_COLOR_FALLBACK
  const previewTextColor = getContrastTextColor(previewColor)
  const previewLabel =
    watchedDisplayName.trim() || watchedName.trim() || "ALPHA TECNOLOGIA"

  async function handleStoreSubmit(values: StoreSettingsFormValues) {
    try {
      setIsSavingStore(true)

      const response = await fetch("/api/settings/store", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toStoreSettingsMutationInput(values)),
      })
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw createApiError(
          response.status,
          responseData?.error ?? "Não foi possível salvar as configurações da loja."
        )
      }

      toast.success("Configurações da loja salvas com sucesso.")
      queryClient.setQueryData(["settings", "store"], responseData)
      storeForm.reset(toStoreSettingsFormValues(responseData.data))
      router.refresh()
    } catch (error) {
      toast.error(parseApiError(error))

      if (shouldRedirectToLogin(error)) {
        router.replace("/login")
        router.refresh()
      }
    } finally {
      setIsSavingStore(false)
    }
  }

  function handleUsersChanged(shouldRefreshLayout: boolean) {
    void queryClient.invalidateQueries({ queryKey: ["settings", "users"] })

    if (shouldRefreshLayout) {
      router.refresh()
    }
  }

  function handleCategoriesChanged() {
    void queryClient.invalidateQueries({ queryKey: ["settings", "categories"] })
  }

  async function handleCategoryStatusToggle(category: StoreCategorySummary) {
    try {
      setCategoryToggleId(category.id)

      const response = await fetch(`/api/settings/categories/${category.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          active: !category.active,
        }),
      })
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw createApiError(
          response.status,
          responseData?.error ?? "Não foi possível atualizar o status da categoria."
        )
      }

      toast.success(
        category.active
          ? "Categoria desativada com sucesso."
          : "Categoria ativada com sucesso."
      )
      handleCategoriesChanged()
    } catch (error) {
      toast.error(parseApiError(error))

      if (shouldRedirectToLogin(error)) {
        router.replace("/login")
        router.refresh()
      }
    } finally {
      setCategoryToggleId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configurações"
        description="Gerencie os dados da loja, aparência, usuários e categorias operacionais sem sair do painel."
        badge="Sistema"
      />

      {storeQuery.isPending && !store ? (
        <div className="grid gap-6">
          <SectionCard
            title="Loja"
            description="Carregando os dados principais da loja."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </SectionCard>
          <SectionCard
            title="Aparência"
            description="Carregando cor principal e branding da loja."
          >
            <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
              <Skeleton className="h-72" />
              <Skeleton className="h-72" />
            </div>
          </SectionCard>
        </div>
      ) : storeQuery.isError || !store ? (
        <SectionCard
          title="Loja"
          description="Não foi possível carregar os dados da loja."
        >
          <SettingsSectionError
            title="Falha ao carregar as configurações da loja"
            onRetry={storeQuery.refetch}
          />
        </SectionCard>
      ) : (
        <Form {...storeForm}>
          <form
            id="store-settings-form"
            onSubmit={storeForm.handleSubmit(handleStoreSubmit)}
            className="grid gap-6"
          >
            <fieldset
              disabled={isSavingStore}
              className="grid gap-6"
            >
              <SectionCard
                title="Loja"
                description="Atualize o cadastro principal e os identificadores públicos da operação."
                action={
                  <LoadingButton
                    type="submit"
                    form="store-settings-form"
                    isLoading={isSavingStore}
                    loadingLabel="Salvando..."
                  >
                    <BadgeCheck />
                    Salvar alterações
                  </LoadingButton>
                }
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={storeForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da loja *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex.: ALPHA TECNOLOGIA" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={storeForm.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome de exibição</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex.: Alpha Tecnologia" {...field} />
                        </FormControl>
                        <FormDescription>
                          Nome usado na navegação e em telas internas.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={storeForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código da loja *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex.: LOJA-001"
                            value={field.value}
                            onChange={(event) =>
                              field.onChange(event.target.value.toUpperCase())
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          Identificador operacional único da loja.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Aparência"
                description="Ajuste branding, logo e destaques visuais usados nesta tela de configuração."
              >
                <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
                  <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
                    <div className="mb-4 space-y-1">
                      <p className="font-medium text-foreground">Logo da loja</p>
                      <p className="text-sm text-muted-foreground">
                        Envie JPG, PNG ou WEBP com até 5 MB.
                      </p>
                    </div>
                    <ImageUpload
                      currentUrl={watchedLogoUrl || undefined}
                      onUpload={(url) => {
                        storeForm.setValue("logoUrl", url, {
                          shouldTouch: true,
                        })
                      }}
                      onUploadComplete={() => {
                        void queryClient.invalidateQueries({
                          queryKey: ["settings", "store"],
                        })
                      }}
                      productId={store.id}
                      bucket={PRODUCT_IMAGES_BUCKET}
                      endpoint="/api/settings/logo"
                      acceptedTypes={PRODUCT_IMAGE_ACCEPTED_TYPES}
                      maxSizeBytes={PRODUCT_IMAGE_MAX_SIZE_BYTES}
                      variant="compact"
                      description="A logo é salva no Supabase Storage e usada nos previews desta tela."
                    />
                  </div>

                  <div className="grid gap-4">
                    <Card className="border border-border/70 bg-background/80 shadow-sm shadow-black/5">
                      <CardContent className="grid gap-5 p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className="relative flex size-18 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-white/20 shadow-sm"
                              style={{
                                backgroundColor: previewColor,
                                color: previewTextColor,
                              }}
                            >
                              {watchedLogoUrl ? (
                                <Image
                                  src={watchedLogoUrl}
                                  alt="Logo da loja"
                                  fill
                                  sizes="72px"
                                  className="object-cover"
                                />
                              ) : (
                                <span className="text-lg font-semibold">
                                  {getInitials(previewLabel)}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">
                                Preview da marca
                              </p>
                              <p className="text-lg font-semibold text-foreground">
                                {previewLabel}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Código {watchedCode.trim() || "SEM-CODIGO"}
                              </p>
                            </div>
                          </div>

                          <Badge
                            variant="outline"
                            style={{
                              borderColor: withAlpha(previewColor, "45"),
                              backgroundColor: withAlpha(previewColor, "18"),
                              color: previewColor,
                            }}
                          >
                            Cor principal ativa
                          </Badge>
                        </div>

                        <div className="grid gap-3 rounded-3xl border border-border/70 bg-muted/20 p-4">
                          <div className="flex flex-wrap gap-3">
                            <Button
                              type="button"
                              className="border-0"
                              style={{
                                backgroundColor: previewColor,
                                color: previewTextColor,
                              }}
                            >
                              Botão primário
                            </Button>
                            <span
                              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
                              style={{
                                borderColor: withAlpha(previewColor, "40"),
                                backgroundColor: withAlpha(previewColor, "12"),
                                color: previewColor,
                              }}
                            >
                              Badge de destaque
                            </span>
                            <span className="inline-flex items-center rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                              Preview interno
                            </span>
                          </div>

                          <div
                            className="rounded-3xl p-4"
                            style={{
                              background: `linear-gradient(135deg, ${previewColor} 0%, ${withAlpha(
                                previewColor,
                                "D8"
                              )} 100%)`,
                              color: previewTextColor,
                            }}
                          >
                            <p className="text-sm font-medium">
                              Visual aplicado na tela de configurações
                            </p>
                            <p className="mt-1 text-sm opacity-90">
                              A cor principal aparece nos previews, badges e destaques deste
                              módulo para facilitar a conferência visual antes de salvar.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <FormField
                      control={storeForm.control}
                      name="primaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cor principal *</FormLabel>
                          <FormControl>
                            <PrimaryColorField
                              value={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormDescription>
                            Informe uma cor hexadecimal no padrão `#RRGGBB`.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </SectionCard>
            </fieldset>
          </form>
        </Form>
      )}

      <SectionCard
        title="Usuários"
        description="Gerencie quem faz parte da loja, o papel de acesso e o status operacional de cada perfil."
      >
        {usersQuery.isPending && users.length === 0 ? (
          <SettingsTableSkeleton />
        ) : usersQuery.isError ? (
          <SettingsSectionError
            title="Falha ao carregar os usuários da loja"
            onRetry={usersQuery.refetch}
          />
        ) : users.length > 0 ? (
          <div className="rounded-3xl border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Perfil de acesso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <StoreUserRow
                    key={user.id}
                    user={user}
                    roles={roles}
                    currentUserId={currentUserId}
                    onSaved={handleUsersChanged}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            icon={Users2}
            title="Nenhum usuário encontrado."
            description="Os perfis vinculados a esta loja aparecerão aqui para gestão de acesso e status."
          />
        )}
      </SectionCard>

      <SectionCard
        title="Categorias"
        description="Centralize os prefixos e padrões de serialização usados ao cadastrar novos produtos."
        action={<CategoryDialog mode="create" onSaved={handleCategoriesChanged} />}
      >
        {categoriesQuery.isPending && categories.length === 0 ? (
          <SettingsTableSkeleton rows={4} />
        ) : categoriesQuery.isError ? (
          <SettingsSectionError
            title="Falha ao carregar as categorias da loja"
            onRetry={categoriesQuery.refetch}
          />
        ) : categories.length > 0 ? (
          <div className="rounded-3xl border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Prefixo</TableHead>
                  <TableHead>Serial padrão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="whitespace-normal">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-foreground">
                          {category.name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {category.defaultSerialized
                            ? "Novos itens desta categoria já saem com IMEI/serial ativo."
                            : "Novos itens desta categoria não ativam serial por padrão."}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                        {category.prefix}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          category.defaultSerialized
                            ? "border-sky-200 bg-sky-50 text-sky-700"
                            : "border-zinc-200 bg-zinc-100 text-zinc-700"
                        }
                      >
                        {category.defaultSerialized ? "Ativado" : "Desligado"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          category.active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-zinc-200 bg-zinc-100 text-zinc-700"
                        }
                      >
                        {category.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <CategoryDialog
                          mode="edit"
                          category={category}
                          onSaved={handleCategoriesChanged}
                        />
                        <LoadingButton
                          type="button"
                          variant="outline"
                          size="xs"
                          isLoading={categoryToggleId === category.id}
                          loadingLabel={
                            category.active ? "Desativando..." : "Ativando..."
                          }
                          onClick={() => void handleCategoryStatusToggle(category)}
                        >
                          <Power />
                          {category.active ? "Desativar" : "Ativar"}
                        </LoadingButton>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            icon={Tags}
            title="Nenhuma categoria cadastrada."
            description="Crie a primeira categoria da loja para organizar prefixos e o padrão de serialização dos produtos."
            action={<CategoryDialog mode="create" onSaved={handleCategoriesChanged} />}
          />
        )}
      </SectionCard>

      <SectionCard
        title="Preferências"
        description="Parâmetros operacionais globais da loja e automações padrão do cadastro."
      >
        <EmptyState
          icon={SlidersHorizontal}
          title="Preferências operacionais em breve."
          description="O schema atual não possui campos globais para estoque mínimo padrão ou controle de estoque automático em novos produtos. Este bloco já fica preparado sem quebrar a página."
          hint="Sem campos disponíveis no banco atual"
        />
      </SectionCard>
    </div>
  )
}
