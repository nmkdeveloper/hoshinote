import { parseMarkdownWithMath } from '../src/lib/markdown';

const tests = [
  'The candy was $1.',
  'It cost $2.',
  'Range is $1-$2.',
  'Run `echo $PATH$` now',
  'Code `$&` here',
  'Code `$\'` here',
  'Code `` $` `` here',
  'Code `$$` here',
  '```js\nstr.replace(/foo/, "$& bar");\n```',
];

for (const t of tests) {
  console.log('INPUT:', JSON.stringify(t));
  console.log('OUTPUT:', JSON.stringify(parseMarkdownWithMath(t)));
  console.log('---');
}

function fixReplace(text: string, token: string, val: string): string {
  return text.replace(token, () => val);
}

console.log('Testing with () => replacer function:');
let fixed = 'Run ___TOKEN___ now';
fixed = fixReplace(fixed, '___TOKEN___', '`echo $PATH$`');
console.log('Result for `echo $PATH$`:', fixed);

let fixed2 = 'Code ___TOKEN___ here';
fixed2 = fixReplace(fixed2, '___TOKEN___', '`$&`');
console.log('Result for `$&`:', fixed2);
