import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../supabase/server";

export async function requireUser() {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
        redirect("/auth");
    }

    return data.user;
}