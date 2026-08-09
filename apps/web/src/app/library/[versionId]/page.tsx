import { LibraryItemPage } from "@/widgets/library/library-item-page";
export default async function Page({ params }: { params: Promise<{ versionId:string }> }) { return <LibraryItemPage versionId={(await params).versionId} />; }
