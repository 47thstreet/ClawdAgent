import { Router, Request, Response } from 'express';
import { getLatestQR, getWhatsAppStatus, generateQRDataURL, getWAClient } from '../../whatsapp/auth.js';
import logger from '../../../utils/logger.js';
import { groupLinkWatcher } from '../../../actions/whatsapp/group-link-watcher.js';

/** Extract invite code from a full https://chat.whatsapp.com/XYZ URL or bare code */
function parseInviteCode(raw: string): string {
  try {
    const url = new URL(raw);
    return url.pathname.replace(/^\//, '');
  } catch {
    return raw.trim();
  }
}

/**
 * WhatsApp QR code API routes.
 *
 * All routes are mounted behind authMiddleware by the web server,
 * so only authenticated dashboard users can access the QR.
 */
export function setupWhatsAppQRRoutes(): Router {
  const router = Router();

  /**
   * GET /api/whatsapp/qr
   *
   * Returns the current WhatsApp auth status and QR code (if waiting).
   *
   * Response:
   *   { qr: string | null, qrDataUrl: string | null, status: 'waiting' | 'authenticated' | 'auth_failure' | 'disconnected' }
   */
  router.get('/qr', async (_req: Request, res: Response) => {
    const status = getWhatsAppStatus();
    const qr = getLatestQR();
    const qrDataUrl = await generateQRDataURL(qr);

    logger.debug('WhatsApp QR endpoint hit', { status, hasQR: !!qr });

    res.json({ qr, qrDataUrl, status });
  });

  /**
   * GET /api/whatsapp/status
   *
   * Lightweight status-only check (no QR payload).
   */
  router.get('/status', (_req: Request, res: Response) => {
    res.json({ status: getWhatsAppStatus() });
  });

  /**
   * GET /api/whatsapp/groups
   *
   * Returns all WhatsApp groups the connected account is a member of.
   * Requires the client to be authenticated and ready.
   *
   * Response:
   *   { groups: Array<{ id: string, name: string, participantCount: number }> }
   */
  router.get('/groups', async (_req: Request, res: Response) => {
    const client = getWAClient();
    if (!client) {
      res.status(503).json({ error: 'WhatsApp is not connected. Scan the QR code first.' });
      return;
    }

    try {
      const chats = await client.getChats();
      const groups = chats
        .filter(c => c.isGroup)
        .map(c => ({
          id: c.id._serialized,
          name: c.name,
          participantCount: c.participants?.length ?? 0,
        }));

      logger.debug('WhatsApp groups fetched', { count: groups.length });
      res.json({ groups });
    } catch (err: any) {
      logger.error('Failed to fetch WhatsApp groups', { error: err.message });
      res.status(500).json({ error: 'Failed to fetch groups' });
    }
  });

  /**
   * POST /api/whatsapp/send
   *
   * Send a text message to a WhatsApp chat or group.
   *
   * Body: { chatId: string, message: string }
   * Response: { success: true } | { error: string }
   */
  router.post('/send', async (req: Request, res: Response) => {
    const client = getWAClient();
    if (!client) {
      res.status(503).json({ error: 'WhatsApp is not connected. Scan the QR code first.' });
      return;
    }

    const { chatId, message } = req.body as { chatId?: string; message?: string };
    if (!chatId || typeof chatId !== 'string') {
      res.status(400).json({ error: 'chatId is required and must be a string' });
      return;
    }
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message is required and must be a string' });
      return;
    }

    try {
      await client.sendMessage(chatId, message);
      logger.info('WhatsApp message sent', { chatId });
      res.json({ success: true });
    } catch (err: any) {
      logger.error('Failed to send WhatsApp message', { chatId, error: err.message });
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  /**
   * GET /api/whatsapp/chats
   *
   * Returns all chats (groups + DMs), sorted by most recent activity.
   *
   * Query params:
   *   ?type=all|groups|dms   (default: all)
   *   ?limit=N               (default: 50)
   *
   * Response:
   *   { chats: Array<{ id, name, isGroup, unreadCount, timestamp }> }
   */
  router.get('/chats', async (req: Request, res: Response) => {
    const client = getWAClient();
    if (!client) {
      res.status(503).json({ error: 'WhatsApp is not connected.' });
      return;
    }

    const type = (req.query['type'] as string) ?? 'all';
    const limit = Math.min(parseInt((req.query['limit'] as string) ?? '50', 10), 200);

    try {
      const all = await client.getChats();
      const filtered = all
        .filter(c => {
          if (type === 'groups') return c.isGroup;
          if (type === 'dms') return !c.isGroup;
          return true;
        })
        .slice(0, limit)
        .map(c => ({
          id: c.id._serialized,
          name: c.name,
          isGroup: c.isGroup,
          unreadCount: c.unreadCount,
          timestamp: c.timestamp,
        }));

      logger.debug('WhatsApp chats fetched', { count: filtered.length, type });
      res.json({ chats: filtered, count: filtered.length });
    } catch (err: any) {
      logger.error('Failed to fetch WhatsApp chats', { error: err.message });
      res.status(500).json({ error: 'Failed to fetch chats' });
    }
  });

  /**
   * GET /api/whatsapp/messages/:chatId
   *
   * Fetch recent messages from a specific chat or group.
   *
   * Query params:
   *   ?limit=N   (default: 50, max 100)
   *
   * Response:
   *   { messages: Array<{ id, body, from, author, timestamp, type, fromMe, hasMedia }> }
   */
  router.get('/messages/:chatId', async (req: Request, res: Response) => {
    const client = getWAClient();
    if (!client) {
      res.status(503).json({ error: 'WhatsApp is not connected.' });
      return;
    }

    const { chatId } = req.params as { chatId: string };
    const limit = Math.min(parseInt((req.query['limit'] as string) ?? '50', 10), 100);

    try {
      const chat = await client.getChatById(chatId);
      const msgs = await chat.fetchMessages({ limit });

      const messages = msgs.map(m => ({
        id: m.id._serialized,
        body: m.body,
        from: m.from,
        author: m.author ?? m.from,
        timestamp: m.timestamp,
        type: m.type,
        fromMe: m.fromMe,
        hasMedia: m.hasMedia,
      }));

      logger.debug('WhatsApp messages fetched', { chatId, count: messages.length });
      res.json({ messages, count: messages.length });
    } catch (err: any) {
      logger.error('Failed to fetch WhatsApp messages', { chatId, error: err.message });
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  /**
   * GET /api/whatsapp/group/:chatId
   *
   * Get detailed info for a group including participants.
   *
   * Response:
   *   { id, name, participantCount, participants: Array<{ id, isAdmin, isSuperAdmin }> }
   */
  router.get('/group/:chatId', async (req: Request, res: Response) => {
    const client = getWAClient();
    if (!client) {
      res.status(503).json({ error: 'WhatsApp is not connected.' });
      return;
    }

    const { chatId } = req.params as { chatId: string };

    try {
      const chat = await client.getChatById(chatId);
      if (!chat.isGroup) {
        res.status(400).json({ error: 'Chat is not a group' });
        return;
      }

      res.json({
        id: chat.id._serialized,
        name: chat.name,
        participantCount: chat.participants?.length ?? 0,
        participants: (chat.participants ?? []).map(p => ({
          id: p.id._serialized,
          isAdmin: p.isAdmin,
          isSuperAdmin: p.isSuperAdmin,
        })),
      });
    } catch (err: any) {
      logger.error('Failed to fetch WhatsApp group info', { chatId, error: err.message });
      res.status(500).json({ error: 'Failed to fetch group info' });
    }
  });

  /**
   * POST /api/whatsapp/join
   *
   * Join a WhatsApp group via an invite link or code.
   *
   * Body: { inviteLink: string }   — full URL (https://chat.whatsapp.com/XYZ) or bare code
   * Response: { success: true, chatId: string }
   */
  router.post('/join', async (req: Request, res: Response) => {
    const client = getWAClient();
    if (!client) {
      res.status(503).json({ error: 'WhatsApp is not connected.' });
      return;
    }

    const { inviteLink } = req.body as { inviteLink?: string };
    if (!inviteLink || typeof inviteLink !== 'string') {
      res.status(400).json({ error: 'inviteLink is required' });
      return;
    }

    const code = parseInviteCode(inviteLink);
    if (!code) {
      res.status(400).json({ error: 'Could not parse invite code from provided link' });
      return;
    }

    try {
      const chatId = await client.acceptInvite(code);
      logger.info('WhatsApp group joined', { chatId, code });
      res.json({ success: true, chatId });
    } catch (err: any) {
      logger.error('Failed to join WhatsApp group', { code, error: err.message });
      res.status(500).json({ error: `Failed to join group: ${err.message}` });
    }
  });

  /**
   * POST /api/whatsapp/reply
   *
   * Reply to a specific message (quoted reply) in a chat.
   *
   * Body: { chatId: string, messageId: string, message: string }
   * Response: { success: true }
   */
  router.post('/reply', async (req: Request, res: Response) => {
    const client = getWAClient();
    if (!client) {
      res.status(503).json({ error: 'WhatsApp is not connected.' });
      return;
    }

    const { chatId, messageId, message } = req.body as {
      chatId?: string;
      messageId?: string;
      message?: string;
    };

    if (!chatId) { res.status(400).json({ error: 'chatId is required' }); return; }
    if (!messageId) { res.status(400).json({ error: 'messageId is required' }); return; }
    if (!message) { res.status(400).json({ error: 'message is required' }); return; }

    try {
      const chat = await client.getChatById(chatId);
      const msgs = await chat.fetchMessages({ limit: 100 });
      const target = msgs.find(m => m.id._serialized === messageId);

      if (!target) {
        res.status(404).json({ error: 'Message not found. It may be older than the last 100 messages.' });
        return;
      }

      await target.reply(message);
      logger.info('WhatsApp quoted reply sent', { chatId, messageId });
      res.json({ success: true });
    } catch (err: any) {
      logger.error('Failed to send WhatsApp reply', { chatId, messageId, error: err.message });
      res.status(500).json({ error: `Failed to send reply: ${err.message}` });
    }
  });

  /**
   * GET /api/whatsapp/contacts
   *
   * Returns all WhatsApp contacts (non-group, non-self).
   *
   * Response:
   *   { contacts: Array<{ id, name, number, isBusiness }>, count: number }
   */
  router.get('/contacts', async (_req: Request, res: Response) => {
    const client = getWAClient();
    if (!client) { res.status(503).json({ error: 'WhatsApp is not connected.' }); return; }

    try {
      const all = await client.getContacts();
      const contacts = all
        .filter(c => c.isWAContact && !c.isGroup && !c.isMe)
        .map(c => ({
          id: c.id._serialized,
          name: c.name ?? c.pushname ?? '',
          number: c.number,
          isBusiness: c.isBusiness,
        }));
      logger.debug('WhatsApp contacts fetched', { count: contacts.length });
      res.json({ contacts, count: contacts.length });
    } catch (err: any) {
      logger.error('Failed to fetch WhatsApp contacts', { error: err.message });
      res.status(500).json({ error: 'Failed to fetch contacts' });
    }
  });

  /**
   * GET /api/whatsapp/contact/:contactId
   *
   * Get info for a single contact.
   * contactId format: "972501234567@c.us"
   *
   * Response:
   *   { id, name, number, isWAContact, isBusiness }
   */
  router.get('/contact/:contactId', async (req: Request, res: Response) => {
    const client = getWAClient();
    if (!client) { res.status(503).json({ error: 'WhatsApp is not connected.' }); return; }

    const { contactId } = req.params as { contactId: string };
    try {
      const c = await client.getContactById(contactId);
      res.json({
        id: c.id._serialized,
        name: c.name ?? c.pushname ?? '',
        number: c.number,
        isWAContact: c.isWAContact,
        isBusiness: c.isBusiness,
      });
    } catch (err: any) {
      logger.error('Failed to fetch WhatsApp contact', { contactId, error: err.message });
      res.status(500).json({ error: `Failed to fetch contact: ${err.message}` });
    }
  });

  /**
   * POST /api/whatsapp/media
   *
   * Send an image or file to a chat.
   *
   * Body: { chatId: string, base64: string, mimetype: string, filename: string, caption?: string }
   * Response: { success: true }
   */
  router.post('/media', async (req: Request, res: Response) => {
    const client = getWAClient();
    if (!client) { res.status(503).json({ error: 'WhatsApp is not connected.' }); return; }

    const { chatId, base64, mimetype, filename, caption } = req.body as {
      chatId?: string;
      base64?: string;
      mimetype?: string;
      filename?: string;
      caption?: string;
    };

    if (!chatId) { res.status(400).json({ error: 'chatId is required' }); return; }
    if (!base64) { res.status(400).json({ error: 'base64 is required' }); return; }
    if (!mimetype) { res.status(400).json({ error: 'mimetype is required (e.g. image/jpeg)' }); return; }

    try {
      await client.sendMediaMessage(chatId, base64, mimetype, filename ?? 'file', caption);
      logger.info('WhatsApp media sent', { chatId, mimetype });
      res.json({ success: true });
    } catch (err: any) {
      logger.error('Failed to send WhatsApp media', { chatId, error: err.message });
      res.status(500).json({ error: `Failed to send media: ${err.message}` });
    }
  });

  /**
   * POST /api/whatsapp/create-group
   *
   * Create a new WhatsApp group.
   *
   * Body: { name: string, participants: string[] }
   *   participants: array of phone numbers or chat IDs (e.g. ["972501234567@c.us"])
   * Response: { success: true, chatId: string }
   */
  router.post('/create-group', async (req: Request, res: Response) => {
    const client = getWAClient();
    if (!client) { res.status(503).json({ error: 'WhatsApp is not connected.' }); return; }

    const { name, participants } = req.body as { name?: string; participants?: string[] };
    if (!name) { res.status(400).json({ error: 'name is required' }); return; }
    if (!Array.isArray(participants) || participants.length === 0) {
      res.status(400).json({ error: 'participants must be a non-empty array' });
      return;
    }

    try {
      const chatId = await client.createGroup(name, participants);
      logger.info('WhatsApp group created', { name, chatId });
      res.json({ success: true, chatId, name });
    } catch (err: any) {
      logger.error('Failed to create WhatsApp group', { name, error: err.message });
      res.status(500).json({ error: `Failed to create group: ${err.message}` });
    }
  });

  /**
   * POST /api/whatsapp/leave-group
   *
   * Leave a WhatsApp group.
   *
   * Body: { chatId: string }
   * Response: { success: true }
   */
  router.post('/leave-group', async (req: Request, res: Response) => {
    const client = getWAClient();
    if (!client) { res.status(503).json({ error: 'WhatsApp is not connected.' }); return; }

    const { chatId } = req.body as { chatId?: string };
    if (!chatId) { res.status(400).json({ error: 'chatId is required' }); return; }

    try {
      const chat = await client.getChatById(chatId);
      if (!chat.isGroup) { res.status(400).json({ error: 'Chat is not a group' }); return; }
      await chat.leave();
      logger.info('WhatsApp group left', { chatId });
      res.json({ success: true });
    } catch (err: any) {
      logger.error('Failed to leave WhatsApp group', { chatId, error: err.message });
      res.status(500).json({ error: `Failed to leave group: ${err.message}` });
    }
  });

  /**
   * GET /api/whatsapp/invite/:chatId
   *
   * Get the invite link for a group.
   * Requires admin permissions in the group.
   *
   * Response: { inviteCode: string, inviteLink: string }
   */
  router.get('/invite/:chatId', async (req: Request, res: Response) => {
    const client = getWAClient();
    if (!client) { res.status(503).json({ error: 'WhatsApp is not connected.' }); return; }

    const { chatId } = req.params as { chatId: string };
    try {
      const chat = await client.getChatById(chatId);
      if (!chat.isGroup) { res.status(400).json({ error: 'Chat is not a group' }); return; }
      const code = await chat.getInviteCode();
      res.json({ inviteCode: code, inviteLink: `https://chat.whatsapp.com/${code}` });
    } catch (err: any) {
      logger.error('Failed to get WhatsApp invite link', { chatId, error: err.message });
      res.status(500).json({ error: `Failed to get invite link: ${err.message}` });
    }
  });

  /**
   * POST /api/whatsapp/mark-read
   *
   * Mark all messages in a chat as read.
   *
   * Body: { chatId: string }
   * Response: { success: true }
   */
  router.post('/mark-read', async (req: Request, res: Response) => {
    const client = getWAClient();
    if (!client) { res.status(503).json({ error: 'WhatsApp is not connected.' }); return; }

    const { chatId } = req.body as { chatId?: string };
    if (!chatId) { res.status(400).json({ error: 'chatId is required' }); return; }

    try {
      const chat = await client.getChatById(chatId);
      await chat.sendSeen();
      logger.debug('WhatsApp chat marked as read', { chatId });
      res.json({ success: true });
    } catch (err: any) {
      logger.error('Failed to mark WhatsApp chat as read', { chatId, error: err.message });
      res.status(500).json({ error: `Failed to mark as read: ${err.message}` });
    }
  });

  /**
   * POST /api/whatsapp/react
   *
   * React to a specific message with an emoji.
   *
   * Body: { chatId: string, messageId: string, emoji: string }
   * Response: { success: true }
   */
  router.post('/react', async (req: Request, res: Response) => {
    const client = getWAClient();
    if (!client) { res.status(503).json({ error: 'WhatsApp is not connected.' }); return; }

    const { chatId, messageId, emoji } = req.body as { chatId?: string; messageId?: string; emoji?: string };
    if (!chatId) { res.status(400).json({ error: 'chatId is required' }); return; }
    if (!messageId) { res.status(400).json({ error: 'messageId is required' }); return; }
    if (!emoji) { res.status(400).json({ error: 'emoji is required' }); return; }

    try {
      const chat = await client.getChatById(chatId);
      const msgs = await chat.fetchMessages({ limit: 100 });
      const target = msgs.find(m => m.id._serialized === messageId);
      if (!target) { res.status(404).json({ error: 'Message not found in last 100 messages' }); return; }
      await target.react(emoji);
      logger.info('WhatsApp reaction sent', { chatId, messageId, emoji });
      res.json({ success: true });
    } catch (err: any) {
      logger.error('Failed to send WhatsApp reaction', { chatId, error: err.message });
      res.status(500).json({ error: `Failed to react: ${err.message}` });
    }
  });

  /**
   * POST /api/whatsapp/add-participants
   *
   * Add participants to a group (requires admin).
   *
   * Body: { chatId: string, participants: string[] }
   * Response: { success: true }
   */
  router.post('/add-participants', async (req: Request, res: Response) => {
    const client = getWAClient();
    if (!client) { res.status(503).json({ error: 'WhatsApp is not connected.' }); return; }

    const { chatId, participants } = req.body as { chatId?: string; participants?: string[] };
    if (!chatId) { res.status(400).json({ error: 'chatId is required' }); return; }
    if (!Array.isArray(participants) || participants.length === 0) { res.status(400).json({ error: 'participants must be a non-empty array' }); return; }

    try {
      const chat = await client.getChatById(chatId);
      if (!chat.isGroup) { res.status(400).json({ error: 'Chat is not a group' }); return; }
      if (!(chat as any).addParticipants) { res.status(501).json({ error: 'addParticipants not supported' }); return; }
      await (chat as any).addParticipants(participants);
      logger.info('WhatsApp participants added', { chatId, count: participants.length });
      res.json({ success: true, chatId, participants });
    } catch (err: any) {
      logger.error('Failed to add WhatsApp participants', { chatId, error: err.message });
      res.status(500).json({ error: `Failed to add participants: ${err.message}` });
    }
  });

  /**
   * POST /api/whatsapp/remove-participants
   *
   * Remove participants from a group (requires admin).
   *
   * Body: { chatId: string, participants: string[] }
   * Response: { success: true }
   */
  router.post('/remove-participants', async (req: Request, res: Response) => {
    const client = getWAClient();
    if (!client) { res.status(503).json({ error: 'WhatsApp is not connected.' }); return; }

    const { chatId, participants } = req.body as { chatId?: string; participants?: string[] };
    if (!chatId) { res.status(400).json({ error: 'chatId is required' }); return; }
    if (!Array.isArray(participants) || participants.length === 0) { res.status(400).json({ error: 'participants must be a non-empty array' }); return; }

    try {
      const chat = await client.getChatById(chatId);
      if (!chat.isGroup) { res.status(400).json({ error: 'Chat is not a group' }); return; }
      if (!(chat as any).removeParticipants) { res.status(501).json({ error: 'removeParticipants not supported' }); return; }
      await (chat as any).removeParticipants(participants);
      logger.info('WhatsApp participants removed', { chatId, count: participants.length });
      res.json({ success: true, chatId, participants });
    } catch (err: any) {
      logger.error('Failed to remove WhatsApp participants', { chatId, error: err.message });
      res.status(500).json({ error: `Failed to remove participants: ${err.message}` });
    }
  });

  /**
   * POST /api/whatsapp/promote-admin
   *
   * Promote group participants to admin (requires super-admin).
   *
   * Body: { chatId: string, participants: string[] }
   * Response: { success: true }
   */
  router.post('/promote-admin', async (req: Request, res: Response) => {
    const client = getWAClient();
    if (!client) { res.status(503).json({ error: 'WhatsApp is not connected.' }); return; }

    const { chatId, participants } = req.body as { chatId?: string; participants?: string[] };
    if (!chatId) { res.status(400).json({ error: 'chatId is required' }); return; }
    if (!Array.isArray(participants) || participants.length === 0) { res.status(400).json({ error: 'participants must be a non-empty array' }); return; }

    try {
      const chat = await client.getChatById(chatId);
      if (!chat.isGroup) { res.status(400).json({ error: 'Chat is not a group' }); return; }
      if (!(chat as any).promoteParticipants) { res.status(501).json({ error: 'promoteParticipants not supported' }); return; }
      await (chat as any).promoteParticipants(participants);
      logger.info('WhatsApp admins promoted', { chatId, count: participants.length });
      res.json({ success: true, chatId, participants });
    } catch (err: any) {
      logger.error('Failed to promote WhatsApp admins', { chatId, error: err.message });
      res.status(500).json({ error: `Failed to promote admins: ${err.message}` });
    }
  });

  /**
   * POST /api/whatsapp/demote-admin
   *
   * Demote group admins to regular participants (requires super-admin).
   *
   * Body: { chatId: string, participants: string[] }
   * Response: { success: true }
   */
  router.post('/demote-admin', async (req: Request, res: Response) => {
    const client = getWAClient();
    if (!client) { res.status(503).json({ error: 'WhatsApp is not connected.' }); return; }

    const { chatId, participants } = req.body as { chatId?: string; participants?: string[] };
    if (!chatId) { res.status(400).json({ error: 'chatId is required' }); return; }
    if (!Array.isArray(participants) || participants.length === 0) { res.status(400).json({ error: 'participants must be a non-empty array' }); return; }

    try {
      const chat = await client.getChatById(chatId);
      if (!chat.isGroup) { res.status(400).json({ error: 'Chat is not a group' }); return; }
      if (!(chat as any).demoteParticipants) { res.status(501).json({ error: 'demoteParticipants not supported' }); return; }
      await (chat as any).demoteParticipants(participants);
      logger.info('WhatsApp admins demoted', { chatId, count: participants.length });
      res.json({ success: true, chatId, participants });
    } catch (err: any) {
      logger.error('Failed to demote WhatsApp admins', { chatId, error: err.message });
      res.status(500).json({ error: `Failed to demote admins: ${err.message}` });
    }
  });

  /**
   * POST /api/whatsapp/rename-group
   *
   * Rename a group (requires admin).
   *
   * Body: { chatId: string, name: string }
   * Response: { success: true }
   */
  router.post('/rename-group', async (req: Request, res: Response) => {
    const client = getWAClient();
    if (!client) { res.status(503).json({ error: 'WhatsApp is not connected.' }); return; }

    const { chatId, name } = req.body as { chatId?: string; name?: string };
    if (!chatId) { res.status(400).json({ error: 'chatId is required' }); return; }
    if (!name) { res.status(400).json({ error: 'name is required' }); return; }

    try {
      const chat = await client.getChatById(chatId);
      if (!chat.isGroup) { res.status(400).json({ error: 'Chat is not a group' }); return; }
      if (!(chat as any).setSubject) { res.status(501).json({ error: 'setSubject not supported' }); return; }
      await (chat as any).setSubject(name);
      logger.info('WhatsApp group renamed', { chatId, name });
      res.json({ success: true, chatId, name });
    } catch (err: any) {
      logger.error('Failed to rename WhatsApp group', { chatId, error: err.message });
      res.status(500).json({ error: `Failed to rename group: ${err.message}` });
    }
  });

  /**
   * POST /api/whatsapp/set-status
   *
   * Set the WhatsApp account status text (bio/about).
   *
   * Body: { status: string }
   * Response: { success: true }
   */
  router.post('/set-status', async (req: Request, res: Response) => {
    const client = getWAClient();
    if (!client) { res.status(503).json({ error: 'WhatsApp is not connected.' }); return; }

    const { status } = req.body as { status?: string };
    if (!status || typeof status !== 'string') {
      res.status(400).json({ error: 'status text is required' });
      return;
    }

    try {
      await client.setStatus(status);
      logger.info('WhatsApp status updated');
      res.json({ success: true });
    } catch (err: any) {
      logger.error('Failed to set WhatsApp status', { error: err.message });
      res.status(500).json({ error: `Failed to set status: ${err.message}` });
    }
  });

  /**
   * POST /api/whatsapp/broadcast
   *
   * Send the same message to multiple chats at once.
   *
   * Body: { chatIds: string[], message: string, delayMs?: number }
   *   delayMs: optional delay between sends (default: 500ms, min: 200ms)
   * Response: { results: Array<{ chatId, success, error? }>, sent, failed, total }
   */
  router.post('/broadcast', async (req: Request, res: Response) => {
    const client = getWAClient();
    if (!client) { res.status(503).json({ error: 'WhatsApp is not connected.' }); return; }

    const { chatIds, message, delayMs } = req.body as {
      chatIds?: string[];
      message?: string;
      delayMs?: number;
    };

    if (!Array.isArray(chatIds) || chatIds.length === 0) {
      res.status(400).json({ error: 'chatIds must be a non-empty array' }); return;
    }
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message is required' }); return;
    }
    if (chatIds.length > 50) {
      res.status(400).json({ error: 'Maximum 50 recipients per broadcast' }); return;
    }

    const delay = Math.max(200, delayMs ?? 500);
    const results: Array<{ chatId: string; success: boolean; error?: string }> = [];

    for (const chatId of chatIds) {
      try {
        await client.sendMessage(chatId, message);
        results.push({ chatId, success: true });
        logger.debug('Broadcast sent', { chatId });
      } catch (err: any) {
        results.push({ chatId, success: false, error: err.message });
        logger.warn('Broadcast failed for chat', { chatId, error: err.message });
      }
      await new Promise(r => setTimeout(r, delay));
    }

    const sent = results.filter(r => r.success).length;
    logger.info('WhatsApp broadcast complete', { sent, total: chatIds.length });
    res.json({ results, sent, failed: chatIds.length - sent, total: chatIds.length });
  });

  /**
   * GET /api/whatsapp/messages/:chatId/search
   *
   * Search messages in a chat by keyword.
   *
   * Query params:
   *   ?q=keyword         (required)
   *   ?limit=N           (default: 100, max: 500)
   *   ?caseSensitive=true (default: false)
   *
   * Response:
   *   { matches: Array<{ id, body, from, author, timestamp, fromMe }>, count, query }
   */
  router.get('/messages/:chatId/search', async (req: Request, res: Response) => {
    const client = getWAClient();
    if (!client) { res.status(503).json({ error: 'WhatsApp is not connected.' }); return; }

    const { chatId } = req.params as { chatId: string };
    const q = req.query['q'] as string | undefined;
    if (!q) { res.status(400).json({ error: 'q (query) parameter is required' }); return; }

    const limit = Math.min(parseInt((req.query['limit'] as string) ?? '100', 10), 500);
    const caseSensitive = req.query['caseSensitive'] === 'true';

    try {
      const chat = await client.getChatById(chatId);
      const msgs = await chat.fetchMessages({ limit });
      const needle = caseSensitive ? q : q.toLowerCase();
      const matches = msgs
        .filter(m => (caseSensitive ? m.body : m.body.toLowerCase()).includes(needle))
        .map(m => ({
          id: m.id._serialized,
          body: m.body,
          from: m.from,
          author: m.author ?? m.from,
          timestamp: m.timestamp,
          fromMe: m.fromMe,
        }));
      logger.debug('WhatsApp message search', { chatId, q, count: matches.length });
      res.json({ matches, count: matches.length, query: q });
    } catch (err: any) {
      logger.error('Failed to search WhatsApp messages', { chatId, q, error: err.message });
      res.status(500).json({ error: `Failed to search messages: ${err.message}` });
    }
  });

  // ─── Group Link Watcher ───────────────────────────────────────────────────

  /**
   * POST /api/whatsapp/watcher/start
   * Start the automatic group-link watcher (polls every 10 min, auto-joins).
   */
  router.post('/watcher/start', (_req: Request, res: Response) => {
    const result = groupLinkWatcher.start();
    res.json(result);
  });

  /**
   * POST /api/whatsapp/broadcast
   *
   * Send the same message to multiple chats (groups or DMs).
   * Used by the WhatsApp Broadcast UI.
   *
   * Body: { chatIds: string[], message: string }
   * Response: { sent: number, failed: number, errors?: string[] }
   */
  router.post('/broadcast', async (req: Request, res: Response) => {
    const client = getWAClient();
    if (!client) {
      res.status(503).json({ error: 'WhatsApp is not connected. Scan the QR code first.' });
      return;
    }

    const { chatIds, message } = req.body as { chatIds?: string[]; message?: string };
    if (!chatIds || !Array.isArray(chatIds) || chatIds.length === 0) {
      res.status(400).json({ error: 'chatIds must be a non-empty array' });
      return;
    }
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message is required and must be a string' });
      return;
    }
    if (chatIds.length > 50) {
      res.status(400).json({ error: 'Maximum 50 chats per broadcast' });
      return;
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const chatId of chatIds) {
      try {
        await client.sendMessage(chatId, message);
        sent++;
        // Delay between sends to avoid WhatsApp rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (err: any) {
        failed++;
        errors.push(`${chatId}: ${err.message}`);
        logger.error('Broadcast send failed', { chatId, error: err.message });
      }
    }

    logger.info('WhatsApp broadcast completed', { sent, failed, total: chatIds.length });
    res.json({ sent, failed, ...(errors.length > 0 ? { errors } : {}) });
  });

  /**
   * POST /api/whatsapp/watcher/stop
   * Stop the watcher.
   */
  router.post('/watcher/stop', (_req: Request, res: Response) => {
    const result = groupLinkWatcher.stop();
    res.json(result);
  });

  /**
   * GET /api/whatsapp/watcher/status
   * Get watcher status, stats, and recent log.
   */
  router.get('/watcher/status', (_req: Request, res: Response) => {
    res.json(groupLinkWatcher.getStatus());
  });

  /**
   * POST /api/whatsapp/watcher/reset
   * Reset seen-state so all messages are re-scanned on next tick.
   */
  router.post('/watcher/reset', (_req: Request, res: Response) => {
    groupLinkWatcher.reset();
    res.json({ ok: true, message: 'Watcher state reset' });
  });

  return router;
}
