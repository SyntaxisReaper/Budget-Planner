import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, items(name, priority), accounts(name, type), debts(name), goals(name), subscriptions(name), transaction_items(id, amount, item_id, items(name))')
    .limit(1);

  if (error) console.error('SUPABASE ERROR:', error);
  else console.log('SUCCESS');
}

test();
