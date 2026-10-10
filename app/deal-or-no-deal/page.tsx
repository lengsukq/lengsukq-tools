import { redirect } from "next/navigation";

export default function DealOrNoDealLegacyRedirect() {
  redirect("/games/deal-or-no-deal");
}
