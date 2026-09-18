const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (filePath.endsWith('.jsx')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  if (content.includes('tapFeedback') && !content.includes('tapFeedback } from') && !content.includes('{ tapFeedback } from') && !content.includes(', tapFeedback} from')) {
      const depth = file.split(path.sep).length - path.join(__dirname, 'src').split(path.sep).length;
      const prefix = depth === 1 ? './' : '../'.repeat(depth - 1);

      if (content.includes('lib/motion.js')) {
        content = content.replace(/import \{(.*?)\} from '(\.\.?\/lib\/motion\.js)'/, (match, p1, p2) => {
          return `import {${p1}, tapFeedback } from '${p2}'`;
        });
      } else {
        content = `import { tapFeedback } from '${prefix}lib/motion.js';\n` + content;
      }
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Added tapFeedback to ${file}`);
  }
});
