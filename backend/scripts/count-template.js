const fs = require('fs');
const content = fs.readFileSync(require('path').join(__dirname,'../../app/src/data/checklistTemplates.js'), 'utf8');
const iso9001Part = content.split('export const ISO_14001_TEMPLATE')[0];
const refs = iso9001Part.match(/clauseRef:\s*"([^"]+)"/g) || [];
console.log('Domande con clauseRef in ISO_9001_TEMPLATE: ' + refs.length);
refs.forEach(r => console.log('  ' + r));
