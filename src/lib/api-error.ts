type ApiErrorLike = {
  status?: number
  message?: string
  error?: string
}

type ApiError = Error & {
  status?: number
}

function isResponseLike(value: unknown): value is Response {
  return value instanceof Response
}

function isApiErrorLike(value: unknown): value is ApiErrorLike {
  return typeof value === "object" && value !== null
}

function getErrorStatus(error: unknown) {
  if (isResponseLike(error)) {
    return error.status
  }

  if (error instanceof Error && "status" in error) {
    return Number((error as ApiError).status)
  }

  if (isApiErrorLike(error)) {
    return Number(error.status)
  }

  return null
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message?.trim() ?? ""
  }

  if (isApiErrorLike(error)) {
    if (typeof error.message === "string" && error.message.trim()) {
      return error.message.trim()
    }

    if (typeof error.error === "string" && error.error.trim()) {
      return error.error.trim()
    }
  }

  return ""
}

function isNetworkErrorMessage(message: string) {
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(
    message
  )
}

export function createApiError(status: number, message?: string) {
  const error = new Error(message ?? "") as ApiError

  error.status = status

  return error
}

export function shouldRedirectToLogin(error: unknown) {
  return getErrorStatus(error) === 401
}

export function parseApiError(error: unknown) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "Sem conexão com o servidor"
  }

  const status = getErrorStatus(error)
  const message = getErrorMessage(error)

  if (isNetworkErrorMessage(message)) {
    return "Sem conexão com o servidor"
  }

  if (status === 400) {
    return message || "Dados inválidos"
  }

  if (status === 401) {
    return "Sessão expirada"
  }

  if (status === 403) {
    return "Sem permissão para esta ação"
  }

  if (status === 404) {
    return "Registro não encontrado"
  }

  if (status === 409) {
    return message || "Conflito de dados"
  }

  if (status !== null && status >= 500) {
    return "Erro interno. Tente novamente."
  }

  return message || "Não foi possível processar a operação."
}
