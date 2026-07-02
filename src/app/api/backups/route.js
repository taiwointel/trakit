import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("entry_backups")
    .select("id, label, created_at, entry_count")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error?.code === "42P01" || error?.message?.includes("entry_backups") || error?.message?.includes("schema cache")) {
    return NextResponse.json({ backups: [], needsMigration: true });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ backups: data || [] });
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const label = body.label || `Manual backup — ${new Date().toLocaleString("en-NG")}`;

  const { data: entries, error: fetchError } = await supabase
    .from("entries")
    .select("*")
    .eq("user_id", user.id);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const { data, error } = await supabase
    .from("entry_backups")
    .insert({
      user_id:     user.id,
      label,
      entry_count: (entries || []).length,
      data:        entries || [],
    })
    .select("id, label, created_at, entry_count")
    .single();

  if (error?.code === "42P01" || error?.message?.includes("entry_backups") || error?.message?.includes("schema cache")) {
    return NextResponse.json(
      { error: "Backup table not set up yet. Run the migration in your Supabase SQL editor.", needsMigration: true },
      { status: 400 },
    );
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ backup: data });
}
