import { createClient } from '@supabase/supabase-js';
import { appConfig, integrations } from './config';

const supabaseUrl = appConfig.supabase.url;
const supabaseAnonKey = appConfig.supabase.anonKey;

export const isSupabaseConfigured = integrations.supabase;

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;
