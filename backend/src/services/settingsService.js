import { supabase } from '../lib/supabase.js';

export async function getSettings(userId) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is row not found
    throw error;
  }
  
  if (!data) {
    // Return default empty state
    return {
      current_balance: 0,
      cycle_income: 0,
      cycle_start_date: new Date().toISOString().split('T')[0],
      cycle_days: 30
    };
  }

  return data;
}

export async function updateSettings(userId, settingsData) {
  const { current_balance, cycle_income, cycle_start_date, cycle_days } = settingsData;
  
  const { data, error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      current_balance,
      cycle_income,
      cycle_start_date,
      cycle_days,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}
