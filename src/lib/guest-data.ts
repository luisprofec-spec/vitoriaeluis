import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Guest = Tables<"guests">;
export type InfoMenu = Tables<"custom_menus">;
export const guestsQuery = { queryKey: ["guests"], queryFn: async () => {
  const { data, error } = await supabase.from("guests").select("*").order("full_name");
  if (error) throw error;
  return data ?? [];
} };
export const menusQuery = { queryKey: ["custom-menus"], queryFn: async () => {
  const { data, error } = await supabase.from("custom_menus").select("*").order("display_order").order("created_at");
  if (error) throw error;
  return data ?? [];
} };
export function useInfoMenus() { return useQuery(menusQuery); }