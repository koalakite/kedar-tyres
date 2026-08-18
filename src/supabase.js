import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://lnbqmumfetagqbwvvmdc.supabase.co";
const supabasePublishableKey = "sb_publishable_B63L1MfcRkW0gO737DhGPg_vhGWWtd2";

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);