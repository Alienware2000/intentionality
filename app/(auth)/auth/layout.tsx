// app/(auth)/layout.tsx
export default function AuthLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="w-full max-w-xl">{children}</div>
            </div>
        </div>
    );
}