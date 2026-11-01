const input = 'Run ___TOKEN___ end';
const code = '`echo $PATH$`'; // notice $ followed by backtick
console.log('Using string replacement:');
console.log(input.replace('___TOKEN___', code));
console.log('\nUsing function replacement:');
console.log(input.replace('___TOKEN___', () => code));
