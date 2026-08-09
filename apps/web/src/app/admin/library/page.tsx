import type { Metadata } from "next";
import { LibraryInventory } from "@/widgets/admin/library-inventory";

export const metadata: Metadata = { title: "Library inventory" };
export default function Page() { return <LibraryInventory />; }
