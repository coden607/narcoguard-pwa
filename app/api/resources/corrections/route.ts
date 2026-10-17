import { reviewRoute } from "@/lib/resource-corrections-server"
export const dynamic = "force-dynamic"
export const GET = (request: Request) => reviewRoute("correction", request)
export const POST = (request: Request) => reviewRoute("correction", request)
export const PATCH = (request: Request) => reviewRoute("correction", request)
