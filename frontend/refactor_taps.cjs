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

  // Replace whileTap={{ scale: 0.9... }} or whileTap={tapBtn} or whileTap={tapCard}
  // Be careful with Signup.jsx / Login.jsx which have `whileTap={!loading ? { scale: 0.97 } : {}}`
  
  // We'll use a regex to find whileTap props that we want to replace
  // regex: whileTap=\{\{ scale: [\d.]+ \}\}
  content = content.replace(/whileTap=\{\{\s*scale:\s*[\d.]+\s*\}\}/g, 'whileTap={tapFeedback} onTapStart={impactLight}');
  content = content.replace(/whileTap=\{tapBtn\}/g, 'whileTap={tapFeedback} onTapStart={impactLight}');
  content = content.replace(/whileTap=\{tapCard\}/g, 'whileTap={tapFeedback} onTapStart={impactLight}');
  content = content.replace(/whileTap=\{!loading \? \{ scale: [\d.]+ \} : \{\}\}/g, 'whileTap={!loading ? tapFeedback : {}} onTapStart={!loading ? impactLight : undefined}');

  if (content !== originalContent) {
    // Need to add imports if they don't exist
    
    // Calculate relative path to lib/haptics.js and lib/motion.js
    const depth = file.split(path.sep).length - path.join(__dirname, 'src').split(path.sep).length;
    const prefix = depth === 1 ? './' : '../'.repeat(depth - 1);
    
    // Handle tapFeedback import
    if (!content.includes('tapFeedback')) {
      if (content.includes('lib/motion.js')) {
        content = content.replace(/import \{(.*?)\} from '(\.\.?\/lib\/motion\.js)'/, (match, p1, p2) => {
          return `import {${p1}, tapFeedback } from '${p2}'`;
        });
      } else {
        content = `import { tapFeedback } from '${prefix}lib/motion.js';\n` + content;
      }
    }
    
    // Handle impactLight import
    if (!content.includes('impactLight')) {
      if (content.includes('lib/haptics.js')) {
        content = content.replace(/import (.*?) from '(\.\.?\/lib\/haptics\.js)'/, (match, p1, p2) => {
          if (p1.includes('{')) {
             return match.replace('{', '{ impactLight, ');
          } else {
             // import toast from '../lib/haptics.js'
             return `import ${p1}, { impactLight } from '${p2}'`;
          }
        });
      } else {
        content = `import { impactLight } from '${prefix}lib/haptics.js';\n` + content;
      }
    }

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
