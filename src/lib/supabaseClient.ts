import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dxfxpjzjmxglfkcmrovk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdWJhc2UiLCJyZWYiOiJkeGZ4cGp6am14Z2xma2Ntcm92ayIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc2NzAxNjM3LCJleHAiOjIwOTIyNzc2Mzd9.L_3gezmRk0ZT9wscbcK2ja0HccKLx2uw1qJKOj6fjE4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
