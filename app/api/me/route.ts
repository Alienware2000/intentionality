import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

export async function GET() {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if ( error || !data.user) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    return NextResponse.json({
        ok: true,
        userId: data.user.id,
        email: data.user.email,
    });
}