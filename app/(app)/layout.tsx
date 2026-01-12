import { requireUser } from "@/app/lib/auth/requireUser";
import Sidebar from "../components/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <div className="relative z-10 flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl p-8">{children}</div>
      </div>
    </div>
  );
}
