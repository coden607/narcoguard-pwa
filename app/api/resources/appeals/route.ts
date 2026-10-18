import { reviewRoute } from "@/lib/resource-corrections-server"
export const dynamic = "force-dynamic"
export const GET = (request: Request) => reviewRoute("appeal", request)
export const POST = (request: Request) => reviewRoute("appeal", request)
export const PATCH = (request: Request) => reviewRoute("appeal", request)
