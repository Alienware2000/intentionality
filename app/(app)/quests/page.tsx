import { requireUser } from "@/app/lib/auth/requireUser";
import QuestsClient from "./QuestsClient";

export default async function QuestsPage() {
  await requireUser();
  return <QuestsClient />;
}
