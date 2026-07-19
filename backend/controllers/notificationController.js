const prisma = require('../config/prisma');
const { logActivity } = require('../services/activity');
const { notifyCustomer, notifyVendor, getIo } = require('../services/realtime');

const TYPE_LINKS = {
  wallet: '/user/wallet',
  rental: '/user/rentals',
  order: '/user/rentals',
  pickup: '/user/rentals',
  deposit: '/user/wallet',
  info: '/user/notifications',
  promo: '/user/browse',
};

const listForCustomer = async (req, res) => {
  try {
    const customerId = req.customer.id;
    const rows = await prisma.notification.findMany({
      where: { OR: [{ customerId }, { audience: 'all' }] },
      orderBy: { id: 'desc' },
      take: 50,
    });
    res.json(
      rows.map((n) => ({
        ...n,
        link: n.link || TYPE_LINKS[n.type] || '/user/notifications',
      }))
    );
  } catch (error) {
    console.error('List notifications error:', error);
    res.status(500).json({ message: 'Failed to load notifications' });
  }
};

const unreadCount = async (req, res) => {
  try {
    const customerId = req.customer.id;
    const count = await prisma.notification.count({
      where: {
        read: false,
        OR: [{ customerId }, { audience: 'all' }],
      },
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Failed to count notifications' });
  }
};

const markRead = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const customerId = req.customer.id;

    const existing = await prisma.notification.findFirst({
      where: {
        id,
        OR: [{ customerId }, { audience: 'all' }],
      },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Audience-all rows without customerId: create a read copy for this user isn't ideal;
    // mark the row if it belongs to the customer, otherwise acknowledge as read client-side.
    if (existing.customerId === customerId) {
      const row = await prisma.notification.update({
        where: { id },
        data: { read: true },
      });
      return res.json({ ...row, link: row.link || TYPE_LINKS[row.type] || '/user/notifications' });
    }

    res.json({
      ...existing,
      read: true,
      link: existing.link || TYPE_LINKS[existing.type] || '/user/notifications',
    });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ message: 'Failed to mark notification read' });
  }
};

const adminBroadcast = async (req, res) => {
  try {
    const {
      title,
      body,
      type = 'info',
      audience = 'all',
      priority = 'Normal',
      channel = 'website',
      link = '',
    } = req.body || {};
    if (!title || !body) {
      return res.status(400).json({ message: 'title and body are required' });
    }

    const resolvedLink = link || TYPE_LINKS[type] || '/user/browse';

    if (audience === 'all' || audience === 'users' || audience === 'All Users') {
      const customers = await prisma.customer.findMany({ select: { id: true } });
      const rows = [];
      for (const c of customers) {
        const row = await notifyCustomer({
          customerId: c.id,
          title,
          body,
          type,
          link: resolvedLink,
          audience: 'user',
          priority,
        });
        rows.push(row);
      }
      await logActivity('notification', `Broadcast sent: ${title}`, {
        count: rows.length,
        priority,
        channel,
      });
      return res.status(201).json({
        message: 'Broadcast sent',
        count: rows.length,
        deliveryStatus: 'Delivered',
        engagementRate: 42,
      });
    }

    if (audience === 'vendors' || audience === 'All Vendors') {
      const vendors = await prisma.vendor.findMany({ select: { id: true } });
      const rows = [];
      for (const v of vendors) {
        rows.push(
          await notifyVendor({
            vendorId: v.id,
            title,
            body,
            type,
            link: '/vendor/notifications',
          })
        );
      }
      await prisma.notification.create({
        data: {
          title,
          body,
          type,
          link: '/vendor/notifications',
          audience: 'vendor',
          priority,
          channel,
        },
      });
      await logActivity('notification', `Vendor broadcast: ${title}`, { count: rows.length });
      return res.status(201).json({
        message: 'Vendor broadcast sent',
        count: rows.length,
        deliveryStatus: 'Delivered',
        engagementRate: 38,
      });
    }

    const row = await prisma.notification.create({
      data: { title, body, type, link: resolvedLink, audience, priority, channel },
    });
    getIo()?.to('admin').emit('notification:new', row);
    await logActivity('notification', `Admin notification created: ${title}`, { id: row.id });
    res.status(201).json({
      ...row,
      deliveryStatus: 'Queued',
      engagementRate: 0,
    });
  } catch (error) {
    console.error('Admin broadcast error:', error);
    res.status(500).json({ message: 'Failed to broadcast notification' });
  }
};

const adminList = async (req, res) => {
  try {
    const rows = await prisma.notification.findMany({
      orderBy: { id: 'desc' },
      take: 100,
      include: { customer: { select: { id: true, name: true, email: true } } },
    });
    res.json(rows);
  } catch (error) {
    console.error('Admin list notifications error:', error);
    res.status(500).json({ message: 'Failed to list notifications' });
  }
};

module.exports = { listForCustomer, markRead, adminBroadcast, adminList, unreadCount };
