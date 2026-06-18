const EventEmitter = require('events');

const emitter = new EventEmitter();
emitter.setMaxListeners(200);

// Map userId (string) → Set of res objects
const clients = new Map();

function addClient(userId, res) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(res);
}

function removeClient(userId, res) {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clients.delete(userId);
}

function sendToUser(userId, event, data) {
  const set = clients.get(String(userId));
  if (!set || set.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try { res.write(payload); } catch { /* client disconnected */ }
  }
}

function broadcastToManagers(branchId, event, data) {
  emitter.emit('manager-event', { branchId: String(branchId), event, data });
}

module.exports = { addClient, removeClient, sendToUser, broadcastToManagers, emitter };
