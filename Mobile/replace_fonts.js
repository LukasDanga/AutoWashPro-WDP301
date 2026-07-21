const fs = require('fs'); 
const path = require('path'); 

function walk(dir) { 
    let results = []; 
    const list = fs.readdirSync(dir); 
    list.forEach(file => { 
        file = path.join(dir, file); 
        const stat = fs.statSync(file); 
        if (stat && stat.isDirectory()) { 
            if (!file.includes('node_modules') && !file.includes('.expo')) {
                results = results.concat(walk(file)); 
            }
        } else { 
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file); 
            }
        } 
    }); 
    return results; 
} 

const files = walk('e:/WDP/AutoWashPro-WDP301/Mobile/app').concat(walk('e:/WDP/AutoWashPro-WDP301/Mobile/src')); 
let changed = 0; 

files.forEach(file => { 
    let content = fs.readFileSync(file, 'utf8'); 
    let original = content; 
    
    // Ignore layout and typography config
    if (!file.endsWith('_layout.tsx') && !file.endsWith('typography.ts')) { 
        content = content.replace(/Inter_400Regular/g, 'Outfit_400Regular'); 
        content = content.replace(/Inter_500Medium/g, 'Outfit_500Medium'); 
        content = content.replace(/Inter_600SemiBold/g, 'Outfit_600SemiBold'); 
        content = content.replace(/Inter_700Bold/g, 'Outfit_700Bold'); 
    } 
    
    if (content !== original) { 
        fs.writeFileSync(file, content, 'utf8'); 
        changed++; 
    } 
}); 

console.log('Updated ' + changed + ' files.');
