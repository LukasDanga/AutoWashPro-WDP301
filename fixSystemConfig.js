const fs = require('fs');

let content = fs.readFileSync('FE/src/components/admin/config-tabs/SystemConfigGeneric.jsx', 'utf8');

// 1. Remove filter
content = content.replace(
  'const filtered = json.data.filter(c => categories.includes(c.category) && c.key !== \'ADVANCE_BOOKING_LIMITS\' && c.key !== \'SLOT_PACK_DISCOUNTS\');',
  'const filtered = json.data.filter(c => categories.includes(c.category));'
);

// 2. Initialize form with stringified JSON
content = content.replace(
  '        filtered.forEach(c => {\n          initialForm[c.key] = c.value;\n        });',
  `        filtered.forEach(c => {
          initialForm[c.key] = c.type === 'json' ? JSON.stringify(c.value, null, 2) : c.value;
        });`
);

// 3. handleDiscard initialization
content = content.replace(
  '    configs.forEach(c => {\n      initialForm[c.key] = c.value;\n    });',
  `    configs.forEach(c => {
      initialForm[c.key] = c.type === 'json' ? JSON.stringify(c.value, null, 2) : c.value;
    });`
);

// 4. handleChange comparison
content = content.replace(
  '    configs.forEach(c => {\n      if (newForm[c.key] !== c.value) changed = true;\n    });',
  `    configs.forEach(c => {
      if (c.type === 'json') {
        try {
          if (JSON.stringify(JSON.parse(newForm[c.key])) !== JSON.stringify(c.value)) changed = true;
        } catch(e) { changed = true; }
      } else {
        if (newForm[c.key] !== c.value) changed = true;
      }
    });`
);

// 5. handleSave mapping
content = content.replace(
  '    const changes = configs.filter(c => formValues[c.key] !== c.value).map(c => ({\n      key: c.key,\n      value: formValues[c.key],\n      type: c.type,\n      category: c.category,\n      scope: c.scope,\n      isPublic: c.isPublic,\n      description: c.description\n    }));',
  `    const changes = configs.filter(c => {
      if (c.type === 'json') {
        try {
          return JSON.stringify(JSON.parse(formValues[c.key])) !== JSON.stringify(c.value);
        } catch(e) { return false; } // Ignore invalid JSON on save
      }
      return formValues[c.key] !== c.value;
    }).map(c => ({
      key: c.key,
      value: c.type === 'json' ? JSON.parse(formValues[c.key]) : formValues[c.key],
      type: c.type,
      category: c.category,
      scope: c.scope,
      isPublic: c.isPublic,
      description: c.description
    }));`
);

// 6. render JSON type
content = content.replace(
  '              ) : config.type === \'number\' ? (',
  `              ) : config.type === 'json' ? (
                <textarea
                  value={formValues[config.key] ?? ''}
                  onChange={(e) => handleChange(config.key, e.target.value)}
                  className="w-full max-w-2xl rounded-lg border-slate-200 text-sm font-mono outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-2.5 bg-slate-50 min-h-[150px]"
                />
              ) : config.type === 'number' ? (`
);

fs.writeFileSync('FE/src/components/admin/config-tabs/SystemConfigGeneric.jsx', content, 'utf8');
console.log('SystemConfigGeneric.jsx updated successfully!');
