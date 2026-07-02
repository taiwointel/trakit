import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request, { params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: backup, error: fetchError } = await supabase
    .from("entry_backups")
    .select("data, entry_count, label")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !backup) {
    return NextResponse.json({ error: "Backup not found" }, { status: 404 });
  }

  const entries = backup.data || [];

  const { error: deleteError } = await supabase
    .from("entries")
    .delete()
    .eq("user_id", user.id);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  if (entries.length > 0) {
    const toInsert = entries.map(({ id: _id, ...rest }) => ({
      ...rest,
      user_id: user.id,
    }));

    const { error: insertError } = await supabase.from("entries").insert(toInsert);
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ restored: entries.length, label: backup.label });
}
