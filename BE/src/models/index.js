const fs = require('fs');
const path = require('path');

const schemaFiles = fs.readdirSync(__dirname).filter((f) => f.endsWith('.schema.js') && f !== 'index.js');

const models = {};
schemaFiles.forEach((file) => {
  const pascal = file.replace('.schema.js', '').replace(/^./, (c) => c.toUpperCase());
  models[pascal] = require(path.join(__dirname, file));
});

module.exports = models;
