import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "ALPHA TECNOLOGIA v2",
    timestamp: new Date(),
  })
}
