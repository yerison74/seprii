import { supabase } from '../lib/supabase';

export const adminLogin = (email: string, password: string) => {
  return supabase.auth.signInWithPassword({ email, password });
};

export const adminLogout = () => supabase.auth.signOut();

export const getAdminSession = () => supabase.auth.getSession();
