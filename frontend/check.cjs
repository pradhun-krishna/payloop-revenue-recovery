const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
let foundError = false;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const importRegex = /import\s+.*?\s+from\s+['"](.*?)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('.')) {
      const resolvedDir = path.dirname(file);
      const targetPathBase = path.resolve(resolvedDir, importPath);
      
      const targetDir = path.dirname(targetPathBase);
      if (!fs.existsSync(targetDir)) continue;
      
      const targetName = path.basename(targetPathBase);
      const dirContents = fs.readdirSync(targetDir);
      
      const exactMatch = dirContents.find(c => c === targetName || c === targetName + '.js' || c === targetName + '.jsx');
      const caseInsensitiveMatch = dirContents.find(c => c.toLowerCase() === targetName.toLowerCase() || c.toLowerCase() === targetName.toLowerCase() + '.js' || c.toLowerCase() === targetName.toLowerCase() + '.jsx');
      
      if (!exactMatch && caseInsensitiveMatch) {
        console.log('CASE MISMATCH in ' + file + ' : imported as ' + importPath + ' but actual file is ' + caseInsensitiveMatch);
        foundError = true;
      }
    }
  }
});

if (!foundError) console.log('No case mismatches found.');
