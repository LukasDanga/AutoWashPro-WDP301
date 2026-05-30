const fs = require('fs');
const path = require('path');

const schemaFiles = fs.readdirSync(__dirname).filter((f) => f.endsWith('.schema.js') && f !== 'index.js');

const models = {};
schemaFiles.forEach((file) => {
  const name = file.replace('.schema.js', '');
  models[name] = require(path.join(__dirname, file));
});

module.exports = models;
