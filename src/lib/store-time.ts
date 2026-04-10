const DEFAULT_STORE_TIMEZONE = "America/Sao_Paulo"

type TimeZoneParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function getTimeZoneFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
}

function getTimeZoneParts(date: Date, timeZone: string): TimeZoneParts {
  const formatter = getTimeZoneFormatter(timeZone)
  const parts = formatter.formatToParts(date)
  const values = new Map(parts.map((part) => [part.type, part.value]))

  return {
    year: Number(values.get("year") ?? 0),
    month: Number(values.get("month") ?? 1),
    day: Number(values.get("day") ?? 1),
    hour: Number(values.get("hour") ?? 0),
    minute: Number(values.get("minute") ?? 0),
    second: Number(values.get("second") ?? 0),
  }
}

function padDateUnit(value: number) {
  return String(value).padStart(2, "0")
}

function shiftDateString(value: string, days: number) {
  const [year, month, day] = value.split("-").map((item) => Number(item))
  const nextDate = new Date(Date.UTC(year, month - 1, day))

  nextDate.setUTCDate(nextDate.getUTCDate() + days)

  return `${nextDate.getUTCFullYear()}-${padDateUnit(nextDate.getUTCMonth() + 1)}-${padDateUnit(nextDate.getUTCDate())}`
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getTimeZoneParts(date, timeZone)
  const utcTimestamp = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  )

  return utcTimestamp - date.getTime()
}

export function getDateStringInTimeZone(
  date: Date,
  timeZone = DEFAULT_STORE_TIMEZONE
) {
  const parts = getTimeZoneParts(date, timeZone)

  return `${parts.year}-${padDateUnit(parts.month)}-${padDateUnit(parts.day)}`
}

export function getTodayDateStringInTimeZone(timeZone = DEFAULT_STORE_TIMEZONE) {
  return getDateStringInTimeZone(new Date(), timeZone)
}

export function getMonthStartDateString(value: string) {
  const [year, month] = value.split("-")

  return `${year}-${month}-01`
}

export function zonedDateTimeToUtc(
  dateString: string,
  timeZone = DEFAULT_STORE_TIMEZONE,
  hour = 0,
  minute = 0,
  second = 0
) {
  const [year, month, day] = dateString.split("-").map((item) => Number(item))
  const initialUtcGuess = Date.UTC(year, month - 1, day, hour, minute, second)
  const guessDate = new Date(initialUtcGuess)
  const initialOffset = getTimeZoneOffsetMs(guessDate, timeZone)
  let resolved = new Date(initialUtcGuess - initialOffset)
  const correctedOffset = getTimeZoneOffsetMs(resolved, timeZone)

  if (correctedOffset !== initialOffset) {
    resolved = new Date(initialUtcGuess - correctedOffset)
  }

  return resolved
}

export function getDayRangeUtc(dateString: string, timeZone = DEFAULT_STORE_TIMEZONE) {
  const start = zonedDateTimeToUtc(dateString, timeZone, 0, 0, 0)
  const end = zonedDateTimeToUtc(shiftDateString(dateString, 1), timeZone, 0, 0, 0)

  return {
    start,
    end,
  }
}

export function getDateRangeUtc(
  startDate: string,
  endDate: string,
  timeZone = DEFAULT_STORE_TIMEZONE
) {
  const start = zonedDateTimeToUtc(startDate, timeZone, 0, 0, 0)
  const end = zonedDateTimeToUtc(shiftDateString(endDate, 1), timeZone, 0, 0, 0)

  return {
    start,
    end,
  }
}

export function getHourInTimeZone(value: string, timeZone = DEFAULT_STORE_TIMEZONE) {
  return getTimeZoneParts(new Date(value), timeZone).hour
}

export function formatDateTimeInTimeZone(
  value: string,
  timeZone = DEFAULT_STORE_TIMEZONE
) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

export function formatDateInTimeZone(
  value: string,
  timeZone = DEFAULT_STORE_TIMEZONE
) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    dateStyle: "short",
  }).format(new Date(value))
}

export { DEFAULT_STORE_TIMEZONE }
