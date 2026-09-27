import vCard from 'vcf';

export function parseVCF(fileText) {
  const cards = vCard.parse(fileText);
  // vcf library returns either an array of jCard objects or a single one
  const cardArray = Array.isArray(cards) ? cards : [cards];
  
  return cardArray.map(card => {
    // Note: vcf library API might differ depending on version. 
    // Typical API: card.get('fn') returns an object with a valueOf() method or a string
    const fn = card.get('fn');
    const n = card.get('n');
    const name = (fn && fn.valueOf()) || (n && n.valueOf()) || null;
    
    const tel = card.get('tel');
    // A single contact might have multiple phones. 
    const phone = Array.isArray(tel) ? tel[0]?.valueOf() : tel?.valueOf() || null;
    
    const emailProp = card.get('email');
    const email = Array.isArray(emailProp) ? emailProp[0]?.valueOf() : emailProp?.valueOf() || null;
    
    const bday = card.get('bday');
    const birthday = parseBirthday(bday?.valueOf());

    return {
      name: typeof name === 'string' ? name : null,
      phone: typeof phone === 'string' ? phone : null,
      email: typeof email === 'string' ? email : null,
      birthday
    };
  }).filter(c => c.name); // skip cards with no name
}

export function parseCSV(fileText) {
  // Google Contacts CSV columns: Name, Given Name, Phone 1 - Value, E-mail 1 - Value, Birthday
  const lines = fileText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
  return lines.slice(1).map(line => {
    // Basic CSV splitting (doesn't handle commas inside quotes perfectly, but good enough for typical simple exports)
    const cols = line.split(',').map(c => c.replace(/"/g, '').trim());
    const get = (key) => cols[headers.indexOf(key)] || null;
    return {
      name:     get('name') || get('given name'),
      phone:    get('phone 1 - value') || get('mobile phone'),
      email:    get('e-mail 1 - value') || get('email'),
      birthday: parseBirthday(get('birthday')),
    };
  }).filter(c => c.name);
}

function parseBirthday(raw) {
  if (!raw) return null;
  // Handles: YYYYMMDD, YYYY-MM-DD, MM/DD/YYYY, --MMDD (no year)
  const patterns = [
    { re: /^(\d{4})(\d{2})(\d{2})$/,     fmt: (m) => `${m[1]}-${m[2]}-${m[3]}` },
    { re: /^(\d{4})-(\d{2})-(\d{2})$/,   fmt: (m) => `${m[1]}-${m[2]}-${m[3]}` },
    { re: /^(\d{2})\/(\d{2})\/(\d{4})$/, fmt: (m) => `${m[3]}-${m[1]}-${m[2]}` },
    { re: /^--(\d{2})(\d{2})$/,          fmt: (m) => `0000-${m[1]}-${m[2]}` }, // no year
  ];
  for (const { re, fmt } of patterns) {
    const m = raw.match(re);
    if (m) return fmt(m);
  }
  return null;
}
