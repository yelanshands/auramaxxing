import { createClient } from "@supabase/supabase-js";

console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('KEY:', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);