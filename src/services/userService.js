import { supabase } from "../supabaseClient.js";

export async function getUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  console.log("USERS FROM DB:", data ?? null, error ?? null);

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}
