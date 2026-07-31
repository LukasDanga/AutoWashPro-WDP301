const fs = require('fs');
const path = require('path');

const hookPath = path.join(__dirname, 'FE', 'src', 'hooks', 'useSystemConfig.jsx');
let content = fs.readFileSync(hookPath, 'utf8');

content = content.replace(
  `        // Convert array of configs to a key-value map for O(1) lookup
        const configMap = {};
        json.data.forEach(item => {
          configMap[item.key] = item.value;
        });
        
        if (isMounted) {
          setConfigs(configMap);
        }`,
  `        if (isMounted) {
          // Backend already returns an object map for /configs/public
          setConfigs(Array.isArray(json.data) ? json.data.reduce((acc, cur) => ({...acc, [cur.key]: cur.value}), {}) : json.data);
        }`
);

fs.writeFileSync(hookPath, content, 'utf8');
console.log('Fixed useSystemConfig.jsx');
