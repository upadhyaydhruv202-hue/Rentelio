const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/prisma');

let io = null;

function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
    path: '/socket.io',
  });

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        String(socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '');
      if (!token) return next(new Error('Unauthorized'));
      const payload = verifyToken(token);
      socket.data.role = payload.type;
      socket.data.id = Number(payload.id);
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { role, id } = socket.data;
    if (role === 'customer') socket.join(`customer:${id}`);
    if (role === 'vendor') socket.join(`vendor:${id}`);
    if (role === 'admin' || role === 'staff') socket.join('admin');
    socket.emit('realtime:ready', { role, id });
  });

  return io;
}

function getIo() {
  return io;
}

function emitToCustomer(customerId, event, payload) {
  if (!io || !customerId) return;
  io.to(`customer:${customerId}`).emit(event, payload);
}

function emitToVendor(vendorId, event, payload) {
  if (!io || !vendorId) return;
  io.to(`vendor:${vendorId}`).emit(event, payload);
}

function emitToAdmin(event, payload) {
  if (!io) return;
  io.to('admin').emit(event, payload);
}

/** Create customer notification + push over socket */
async function notifyCustomer({
  customerId,
  title,
  body,
  type = 'info',
  link = '',
  audience = 'user',
  priority = 'Normal',
}) {
  const row = await prisma.notification.create({
    data: {
      customerId: customerId != null ? Number(customerId) : null,
      title,
      body,
      type,
      link: link || '',
      audience,
      priority,
      channel: 'website',
    },
  });
  if (customerId) {
    emitToCustomer(customerId, 'notification:new', row);
  } else if (audience === 'all') {
    io?.emit('notification:new', row);
  }
  return row;
}

/** Create vendor notification + push over socket */
async function notifyVendor({ vendorId, title, body, type = 'info', link = '' }) {
  const row = await prisma.vendorNotification.create({
    data: {
      vendorId: Number(vendorId),
      title,
      body,
      type,
      link: link || '',
    },
  });
  emitToVendor(vendorId, 'notification:new', row);
  return row;
}

module.exports = {
  initRealtime,
  getIo,
  emitToCustomer,
  emitToVendor,
  emitToAdmin,
  notifyCustomer,
  notifyVendor,
};
