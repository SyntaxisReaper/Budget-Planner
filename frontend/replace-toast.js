import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pagesDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

for (const f of files) {
  const p = path.join(pagesDir, f);
  let content = fs.readFileSync(p, 'utf8');
  if (content.includes("import toast from 'react-hot-toast';")) {
    content = content.replace(
      "import toast from 'react-hot-toast';", 
      "import toast from '../lib/haptics.js';"
    );
    fs.writeFileSync(p, content);
    console.log('Updated ' + f);
  }
}
