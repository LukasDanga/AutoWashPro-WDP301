const fs = require('fs');
const path = require('path');
const basename = path.basename(__filename);

const models = {};
fs.readdirSync(__dirname)
  .filter((file) => file !== basename && file.endsWith('.js'))
  .forEach((file) => {
    const name = file.replace('.js', '');
    models[name] = require(path.join(__dirname, file));
  });

module.exports = models;
