import { redirect } from "next/navigation";
import { getShortLinkUrl } from "@/lib/short-link";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function ShortLinkRedirectPage({ params }: Props) {
  const { code } = await params;
  const url = await getShortLinkUrl(code);

  if (!url) {
    redirect("/?error=short_link_expired");
  }

  redirect(url);
}
