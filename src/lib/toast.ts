"use client"

import { toast as sonnerToast, type ExternalToast } from "sonner"

const SUCCESS_DURATION_MS = 3_000
const ERROR_DURATION_MS = 5_000
const WARNING_DURATION_MS = 4_000

type ToastOptions = Pick<ExternalToast, "description" | "duration">

function success(message: string, options?: ToastOptions) {
  return sonnerToast.success(message, {
    description: options?.description,
    duration: options?.duration ?? SUCCESS_DURATION_MS,
  })
}

function error(message: string, options?: ToastOptions) {
  return sonnerToast.error(message, {
    description: options?.description,
    duration: options?.duration ?? ERROR_DURATION_MS,
  })
}

function warning(message: string, options?: ToastOptions) {
  return sonnerToast.warning(message, {
    description: options?.description,
    duration: options?.duration ?? WARNING_DURATION_MS,
  })
}

function loading(message: string, options?: ToastOptions) {
  return sonnerToast.loading(message, {
    description: options?.description,
    duration: options?.duration,
  })
}

function dismiss(id?: string | number) {
  sonnerToast.dismiss(id)
}

export const toast = {
  success,
  error,
  warning,
  loading,
  dismiss,
}

export { success, error, warning, loading, dismiss }
