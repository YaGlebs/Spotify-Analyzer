const fs = require('fs');
fs.writeFileSync('.gitignore', 'node_modules/\n');
console.log('Файл .gitignore создан и node_modules добавлен в исключения.');