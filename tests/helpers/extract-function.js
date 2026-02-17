const fs = require('node:fs');

function extractFunctionSource(filePath, functionName){
  const src = fs.readFileSync(filePath, 'utf8');
  const marker = `function ${functionName}(`;
  const start = src.indexOf(marker);
  if (start === -1){
    throw new Error(`Function "${functionName}" not found in ${filePath}`);
  }
  const bodyStart = src.indexOf('{', start);
  if (bodyStart === -1){
    throw new Error(`Malformed function "${functionName}" in ${filePath}`);
  }
  let depth = 0;
  let end = -1;
  for (let i = bodyStart; i < src.length; i += 1){
    const ch = src[i];
    if (ch === '{') depth += 1;
    if (ch === '}'){
      depth -= 1;
      if (depth === 0){
        end = i;
        break;
      }
    }
  }
  if (end === -1){
    throw new Error(`Could not resolve function body for "${functionName}" in ${filePath}`);
  }
  return src.slice(start, end + 1);
}

module.exports = { extractFunctionSource };
