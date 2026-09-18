import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = [
  'src/pages/Transactions.jsx',
  'src/pages/Subscriptions.jsx',
  'src/pages/Settings.jsx',
  'src/pages/Items.jsx',
  'src/pages/Goals.jsx',
  'src/pages/Debts.jsx',
  'src/pages/BudgetPlanner.jsx',
  'src/pages/Accounts.jsx'
];

for (const f of files) {
  const p = path.join(__dirname, f);
  if (!fs.existsSync(p)) continue;
  let content = fs.readFileSync(p, 'utf8');
  
  // Replace type="number" with type="number" inputMode="decimal" if it doesn't already have inputMode
  content = content.replace(/<input\s+([^>]*?)type="number"([^>]*?)>/g, (match, p1, p2) => {
    if (match.includes('inputMode')) return match;
    return `<input ${p1}type="number" inputMode="decimal"${p2}>`;
  });
  
  // Specific fix for multiline in Settings/BudgetPlanner
  content = content.replace(/type="number"\s*\n/g, match => {
    return 'type="number" inputMode="decimal"\n';
  });
  
  fs.writeFileSync(p, content);
  console.log('Updated ' + f);
}
