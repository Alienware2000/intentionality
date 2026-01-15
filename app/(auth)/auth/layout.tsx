// Auth Layout - Centered authentication screens
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-base)]">
      <div className="w-full max-w-xl">{children}</div>
    </div>
  );
}
