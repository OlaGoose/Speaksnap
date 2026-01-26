/**
 * Supabase Client Configuration
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Storage helpers
export const uploadImage = async (file: Blob, path: string): Promise<string> => {
  const { data, error } = await supabase.storage
    .from('scenarios')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('scenarios')
    .getPublicUrl(data.path);

  return publicUrl;
};

export const deleteImage = async (url: string): Promise<void> => {
  const path = url.split('/scenarios/')[1];
  if (!path) return;

  const { error } = await supabase.storage.from('scenarios').remove([path]);
  if (error) throw error;
};
