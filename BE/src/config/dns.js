const dns = require('dns');

// Some DNS servers (e.g. home routers) don't support SRV/TXT queries.
// Override with Google + Cloudflare DNS so MongoDB Atlas SRV resolution works.
dns.setServers(['8.8.8.8', '1.1.1.1']);
