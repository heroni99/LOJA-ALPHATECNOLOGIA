/** @type {import("next").NextConfig} */
const DEFAULT_SUPABASE_HOST = "sua-url.supabase.co"
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? `https://${DEFAULT_SUPABASE_HOST}`

function getSupabaseHost() {
  try {
    return new URL(SUPABASE_URL).hostname
  } catch {
    return DEFAULT_SUPABASE_HOST
  }
}

const SUPABASE_HOST = getSupabaseHost()
const IMAGE_REMOTE_PATTERNS = [
  {
    protocol: "https",
    hostname: "**.supabase.co",
  },
  {
    protocol: "https",
    hostname: SUPABASE_HOST,
  },
]

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "X-XSS-Protection",
    value: "0",
  },
]

const nextConfig = {
  images: {
    remotePatterns: IMAGE_REMOTE_PATTERNS,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
