import { createFileRoute } from "@tanstack/react-router";
import { FolioDesk } from "@/components/folio-desk";

export const Route = createFileRoute("/")({ component: FolioDesk });
