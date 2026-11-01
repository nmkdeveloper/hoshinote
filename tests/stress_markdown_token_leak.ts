import { parseMarkdownWithMath, renderMarkdown } from '../src/lib/markdown';

const testCases = [
  { input: 'Run `echo $PATH$` now', expected: '<code>echo $PATH$</code>' },
  { input: 'Regex match is `$1` here', expected: '<code>$1</code>' },
  { input: 'Self match `$&` here', expected: '<code>$&</code>' },
  { input: 'Post match `$\'` here', expected: '<code>$\'</code>' },
  { input: 'Pre match `` $` `` here', expected: '<code>$`</code>' },
  {
    input: '```bash\nexport FOO=$BAR$\n```',
    expected: 'FOO=$BAR$',
  },
];

console.log('Testing special replacement character handling:');
for (const tc of testCases) {
  const output = parseMarkdownWithMath(tc.input);
  const ok = output.includes(tc.expected);
  console.log(`Input: ${JSON.stringify(tc.input)}`);
  console.log(`Output: ${JSON.stringify(output)}`);
  console.log(`Contains expected ${JSON.stringify(tc.expected)}: ${ok ? 'YES' : 'NO'}\n`);
}

const codeBlockInput = 'Here is code:\n```js\nstr.replace(/foo/, "$& bar");\n```';
const codeBlockOutput = parseMarkdownWithMath(codeBlockInput);
console.log('Fenced Code with $&:');
console.log(codeBlockOutput);

const rmInput = '```js\nconsole.log("$&");\n```';
const rmOutput = renderMarkdown(rmInput);
console.log('renderMarkdown with $&:');
console.log(rmOutput);
