"use client"

import { toast as sonnerToast } from "sonner"

const SUCCESS_DURATION_MS = 3_000
const ERROR_DURATION_MS = 5_000

function success(message: string) {
  return sonnerToast.success(message, {
    duration: SUCCESS_DURATION_MS,
  })
}

function error(message: string) {
  return sonnerToast.error(message, {
    duration: ERROR_DURATION_MS,
  })
}

function loading(message: string) {
  return sonnerToast.loading(message)
}

function dismiss(id?: string | number) {
  sonnerToast.dismiss(id)
}

export const toast = {
  success,
  error,
  loading,
  dismiss,
}

export { success, error, loading, dismiss }
