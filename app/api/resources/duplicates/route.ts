import { reviewRoute } from "@/lib/resource-corrections-server"
export const dynamic = "force-dynamic"
export const GET = (request: Request) => reviewRoute("duplicate", request)
export const POST = (request: Request) => reviewRoute("duplicate", request)
export const PATCH = (request: Request) => reviewRoute("duplicate", request)
