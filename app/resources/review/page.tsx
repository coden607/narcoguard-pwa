import type { Metadata } from "next"
import { ResourceReviewPanel } from "@/components/resources/review-panel"
export const metadata: Metadata = { title: "Resource review | NarcoGuard", description: "Report inaccurate hours, request provider corrections and follow a private moderation appeal." }
export default function ResourceReviewPage() { return <ResourceReviewPanel /> }
