import QRCode from 'qrcode';
import { BaseTool, ToolResult } from './base-tool.js';
import { getLatestQR, getWhatsAppStatus, getWAClient } from '../../interfaces/whatsapp/auth.js';
import { groupLinkWatcher } from '../../actions/whatsapp/group-link-watcher.js';

/** Extract invite code from full URL or bare code */
function parseInviteCode(raw: string): string {
  try { return new URL(raw).pathname.replace(/^\//, ''); } catch { return raw.trim(); }
}

const VALID_ACTIONS = [
  'get_qr', 'get_status',
  'get_chats', 'get_groups', 'get_messages', 'get_group_info',
  'get_contacts', 'get_contact_info',
  'send_message', 'send_media', 'reply_message', 'react_message',
  'broadcast', 'search_messages',
  'create_group', 'join_group', 'leave_group',
  'add_participants', 'remove_participants', 'promote_admin', 'demote_admin', 'rename_group',
  'get_invite_link', 'mark_read', 'set_status',
  'watcher_start', 'watcher_stop', 'watcher_status', 'watcher_reset',
] as const;

export class WhatsAppTool extends BaseTool {
  name = 'whatsapp';
  description = `WhatsApp management — actions: ${VALID_ACTIONS.join(', ')}`;

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const action = input.action as string;
    if (!action) return { success: false, output: '', error: 'No action provided' };

    switch (action) {
      case 'get_qr':           return this.getQR();
      case 'get_status':       return this.getStatus();
      case 'get_groups':       return this.getGroups();
      case 'get_chats':        return this.getChats(input);
      case 'get_messages':     return this.getMessages(input);
      case 'get_group_info':   return this.getGroupInfo(input);
      case 'get_contacts':     return this.getContacts();
      case 'get_contact_info': return this.getContactInfo(input);
      case 'send_message':     return this.sendMessage(input);
      case 'send_media':       return this.sendMedia(input);
      case 'reply_message':    return this.replyMessage(input);
      case 'react_message':    return this.reactMessage(input);
      case 'broadcast':        return this.broadcast(input);
      case 'search_messages':  return this.searchMessages(input);
      case 'create_group':     return this.createGroup(input);
      case 'add_participants':    return this.addParticipants(input);
      case 'remove_participants': return this.removeParticipants(input);
      case 'promote_admin':       return this.promoteAdmin(input);
      case 'demote_admin':        return this.demoteAdmin(input);
      case 'rename_group':        return this.renameGroup(input);
      case 'join_group':       return this.joinGroup(input);
      case 'leave_group':      return this.leaveGroup(input);
      case 'get_invite_link':  return this.getInviteLink(input);
      case 'mark_read':        return this.markRead(input);
      case 'set_status':       return this.setStatus(input);
      case 'watcher_start':    return this.watcherStart();
      case 'watcher_stop':     return this.watcherStop();
      case 'watcher_status':   return this.watcherStatus();
      case 'watcher_reset':    return this.watcherReset();
      default:
        return { success: false, output: '', error: `Unknown action: ${action}. Valid: ${VALID_ACTIONS.join(', ')}` };
    }
  }

  private async getQR(): Promise<ToolResult> {
    const status = getWhatsAppStatus();

    if (status === 'authenticated') {
      return { success: true, output: JSON.stringify({ status: 'authenticated', message: 'WhatsApp is already connected and ready.' }) };
    }

    const qr = getLatestQR();
    if (!qr) {
      return {
        success: true,
        output: JSON.stringify({
          status,
          message: status === 'disconnected'
            ? 'WhatsApp is not running. Make sure WHATSAPP_ENABLED=true in .env and restart the server.'
            : 'No QR code available yet. Wait a moment and try again.',
        }),
      };
    }

    // Generate a proper PNG data URL from the QR string
    try {
      const dataUrl = await QRCode.toDataURL(qr, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });

      return {
        success: true,
        output: JSON.stringify({
          status: 'waiting',
          qrImage: dataUrl,
          message: 'Scan this QR code with WhatsApp on your phone to connect.',
        }),
      };
    } catch (err: any) {
      this.error('Failed to generate QR image', { error: err.message });
      return { success: false, output: '', error: 'Failed to generate QR image' };
    }
  }

  private async getStatus(): Promise<ToolResult> {
    const status = getWhatsAppStatus();
    const messages: Record<string, string> = {
      authenticated: 'WhatsApp is connected and ready.',
      waiting: 'Waiting for QR code scan...',
      disconnected: 'WhatsApp is disconnected.',
      auth_failure: 'WhatsApp authentication failed. Try restarting.',
    };
    return {
      success: true,
      output: JSON.stringify({ status, message: messages[status] ?? status }),
    };
  }

  private async sendMessage(input: Record<string, unknown>): Promise<ToolResult> {
    const chatId = input.chatId as string | undefined;
    const message = input.message as string | undefined;

    if (!chatId) return { success: false, output: '', error: 'chatId is required' };
    if (!message) return { success: false, output: '', error: 'message is required' };

    const client = getWAClient();
    if (!client) {
      return { success: false, output: '', error: 'WhatsApp is not connected. Scan the QR code first.' };
    }

    try {
      await client.sendMessage(chatId, message);
      return { success: true, output: JSON.stringify({ sent: true, chatId }) };
    } catch (err: any) {
      return { success: false, output: '', error: `Failed to send message: ${err.message}` };
    }
  }

  private async getGroups(): Promise<ToolResult> {
    const client = getWAClient();
    if (!client) return { success: false, output: '', error: 'WhatsApp is not connected.' };

    try {
      const chats = await client.getChats();
      const groups = chats
        .filter(c => c.isGroup)
        .map(c => ({
          id: c.id._serialized,
          name: c.name,
          participantCount: c.participants?.length ?? 0,
          unreadCount: c.unreadCount,
        }));
      return { success: true, output: JSON.stringify({ groups, count: groups.length }) };
    } catch (err: any) {
      return { success: false, output: '', error: `Failed to fetch groups: ${err.message}` };
    }
  }

  private async getChats(input: Record<string, unknown>): Promise<ToolResult> {
    const client = getWAClient();
    if (!client) return { success: false, output: '', error: 'WhatsApp is not connected.' };

    const type = (input.type as string) ?? 'all';
    const limit = Math.min(Number(input.limit ?? 50), 200);

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
      return { success: true, output: JSON.stringify({ chats: filtered, count: filtered.length }) };
    } catch (err: any) {
      return { success: false, output: '', error: `Failed to fetch chats: ${err.message}` };
    }
  }

  private async getMessages(input: Record<string, unknown>): Promise<ToolResult> {
    const client = getWAClient();
    if (!client) return { success: false, output: '', error: 'WhatsApp is not connected.' };

    const chatId = input.chatId as string | undefined;
    if (!chatId) return { success: false, output: '', error: 'chatId is required' };

    const limit = Math.min(Number(input.limit ?? 50), 100);

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
      return { success: true, output: JSON.stringify({ messages, count: messages.length, chatName: chat.name }) };
    } catch (err: any) {
      return { success: false, output: '', error: `Failed to fetch messages: ${err.message}` };
    }
  }

  private async getGroupInfo(input: Record<string, unknown>): Promise<ToolResult> {
    const client = getWAClient();
    if (!client) return { success: false, output: '', error: 'WhatsApp is not connected.' };

    const chatId = input.chatId as string | undefined;
    if (!chatId) return { success: false, output: '', error: 'chatId is required' };

    try {
      const chat = await client.getChatById(chatId);
      if (!chat.isGroup) return { success: false, output: '', error: 'Chat is not a group' };

      return {
        success: true,
        output: JSON.stringify({
          id: chat.id._serialized,
          name: chat.name,
          participantCount: chat.participants?.length ?? 0,
          participants: (chat.participants ?? []).map(p => ({
            id: p.id._serialized,
            isAdmin: p.isAdmin,
            isSuperAdmin: p.isSuperAdmin,
          })),
        }),
      };
    } catch (err: any) {
      return { success: false, output: '', error: `Failed to fetch group info: ${err.message}` };
    }
  }

  private async replyMessage(input: Record<string, unknown>): Promise<ToolResult> {
    const client = getWAClient();
    if (!client) return { success: false, output: '', error: 'WhatsApp is not connected.' };

    const chatId = input.chatId as string | undefined;
    const messageId = input.messageId as string | undefined;
    const message = input.message as string | undefined;

    if (!chatId) return { success: false, output: '', error: 'chatId is required' };
    if (!messageId) return { success: false, output: '', error: 'messageId is required' };
    if (!message) return { success: false, output: '', error: 'message is required' };

    try {
      const chat = await client.getChatById(chatId);
      const msgs = await chat.fetchMessages({ limit: 100 });
      const target = msgs.find(m => m.id._serialized === messageId);

      if (!target) {
        return { success: false, output: '', error: 'Message not found in last 100 messages' };
      }

      await target.reply(message);
      return { success: true, output: JSON.stringify({ replied: true, chatId, messageId }) };
    } catch (err: any) {
      return { success: false, output: '', error: `Failed to reply: ${err.message}` };
    }
  }

  private async joinGroup(input: Record<string, unknown>): Promise<ToolResult> {
    const client = getWAClient();
    if (!client) return { success: false, output: '', error: 'WhatsApp is not connected.' };

    const inviteLink = input.inviteLink as string | undefined;
    if (!inviteLink) return { success: false, output: '', error: 'inviteLink is required' };

    const code = parseInviteCode(inviteLink);
    if (!code) return { success: false, output: '', error: 'Could not parse invite code' };

    try {
      const chatId = await client.acceptInvite(code);
      return { success: true, output: JSON.stringify({ joined: true, chatId }) };
    } catch (err: any) {
      return { success: false, output: '', error: `Failed to join group: ${err.message}` };
    }
  }

  private async getContacts(): Promise<ToolResult> {
    const client = getWAClient();
    if (!client) return { success: false, output: '', error: 'WhatsApp is not connected.' };

    try {
      const contacts = await client.getContacts();
      const list = contacts
        .filter(c => c.isWAContact && !c.isGroup && !c.isMe)
        .map(c => ({
          id: c.id._serialized,
          name: c.name ?? c.pushname ?? '',
          number: c.number,
          isBusiness: c.isBusiness,
        }));
      return { success: true, output: JSON.stringify({ contacts: list, count: list.length }) };
    } catch (err: any) {
      return { success: false, output: '', error: `Failed to fetch contacts: ${err.message}` };
    }
  }

  private async getContactInfo(input: Record<string, unknown>): Promise<ToolResult> {
    const client = getWAClient();
    if (!client) return { success: false, output: '', error: 'WhatsApp is not connected.' };

    const contactId = input.contactId as string | undefined;
    if (!contactId) return { success: false, output: '', error: 'contactId is required (e.g. "972501234567@c.us")' };

    try {
      const c = await client.getContactById(contactId);
      return {
        success: true,
        output: JSON.stringify({
          id: c.id._serialized,
          name: c.name ?? c.pushname ?? '',
          number: c.number,
          isWAContact: c.isWAContact,
          isBusiness: c.isBusiness,
        }),
      };
    } catch (err: any) {
      return { success: false, output: '', error: `Failed to fetch contact: ${err.message}` };
    }
  }

  private async sendMedia(input: Record<string, unknown>): Promise<ToolResult> {
    const client = getWAClient();
    if (!client) return { success: false, output: '', error: 'WhatsApp is not connected.' };

    const chatId = input.chatId as string | undefined;
    const base64 = input.base64 as string | undefined;
    const mimetype = (input.mimetype as string | undefined) ?? 'image/jpeg';
    const filename = (input.filename as string | undefined) ?? 'file';
    const caption = input.caption as string | undefined;

    if (!chatId) return { success: false, output: '', error: 'chatId is required' };
    if (!base64) return { success: false, output: '', error: 'base64 is required (base64-encoded file data)' };

    try {
      await client.sendMediaMessage(chatId, base64, mimetype, filename, caption);
      return { success: true, output: JSON.stringify({ sent: true, chatId, filename }) };
    } catch (err: any) {
      return { success: false, output: '', error: `Failed to send media: ${err.message}` };
    }
  }

  private async broadcast(input: Record<string, unknown>): Promise<ToolResult> {
    const client = getWAClient();
    if (!client) return { success: false, output: '', error: 'WhatsApp is not connected.' };

    const chatIds = input.chatIds as string[] | undefined;
    const message = input.message as string | undefined;
    const delayMs = Math.max(200, Number(input.delayMs ?? 500));

    if (!Array.isArray(chatIds) || chatIds.length === 0) return { success: false, output: '', error: 'chatIds must be a non-empty array' };
    if (!message) return { success: false, output: '', error: 'message is required' };
    if (chatIds.length > 50) return { success: false, output: '', error: 'Maximum 50 recipients per broadcast' };

    const results: Array<{ chatId: string; success: boolean; error?: string }> = [];
    for (const chatId of chatIds) {
      try {
        await client.sendMessage(chatId, message);
        results.push({ chatId, success: true });
      } catch (err: any) {
        results.push({ chatId, success: false, error: err.message });
      }
      await new Promise(r => setTimeout(r, delayMs));
    }
    const sent = results.filter(r => r.success).length;
    return { success: true, output: JSON.stringify({ results, sent, failed: chatIds.length - sent, total: chatIds.length }) };
  }

  private async searchMessages(input: Record<string, unknown>): Promise<ToolResult> {
    const client = getWAClient();
    if (!client) return { success: false, output: '', error: 'WhatsApp is not connected.' };

    const chatId = input.chatId as string | undefined;
    const q = input.q as string | undefined;
    if (!chatId) return { success: false, output: '', error: 'chatId is required' };
    if (!q) return { success: false, output: '', error: 'q (search query) is required' };

    const limit = Math.min(Number(input.limit ?? 100), 500);
    const caseSensitive = input.caseSensitive === true;

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
      return { success: true, output: JSON.stringify({ matches, count: matches.length, query: q }) };
    } catch (err: any) {
      return { success: false, output: '', error: `Failed to search messages: ${err.message}` };
    }
  }

  private async createGroup(input: Record<string, unknown>): Promise<ToolResult> {
    const client = getWAClient();
    if (!client) return { success: false, output: '', error: 'WhatsApp is not connected.' };

    const name = input.name as string | undefined;
    const participants = input.participants as string[] | undefined;

    if (!name) return { success: false, output: '', error: 'name is required' };
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return { success: false, output: '', error: 'participants must be a non-empty array of phone numbers or chat IDs' };
    }

    try {
      const chatId = await client.createGroup(name, participants);
      return { success: true, output: JSON.stringify({ created: true, chatId, name }) };
    } catch (err: any) {
      return { success: false, output: '', error: `Failed to create group: ${err.message}` };
    }
  }

  private async leaveGroup(input: Record<string, unknown>): Promise<ToolResult> {
    const client = getWAClient();
    if (!client) return { success: false, output: '', error: 'WhatsApp is not connected.' };

    const chatId = input.chatId as string | undefined;
    if (!chatId) return { success: false, output: '', error: 'chatId is required' };

    try {
      const chat = await client.getChatById(chatId);
      if (!chat.isGroup) return { success: false, output: '', error: 'Chat is not a group' };
      await chat.leave();
      return { success: true, output: JSON.stringify({ left: true, chatId }) };
    } catch (err: any) {
      return { success: false, output: '', error: `Failed to leave group: ${err.message}` };
    }
  }

  private async getInviteLink(input: Record<string, unknown>): Promise<ToolResult> {
    const client = getWAClient();
    if (!client) return { success: false, output: '', error: 'WhatsApp is not connected.' };

    const chatId = input.chatId as string | undefined;
    if (!chatId) return { success: false, output: '', error: 'chatId is required' };

    try {
      const chat = await client.getChatById(chatId);
      if (!chat.isGroup) return { success: false, output: '', error: 'Chat is not a group' };
      const code = await chat.getInviteCode();
      return {
        success: true,
        output: JSON.stringify({
          inviteCode: code,
          inviteLink: `https://chat.whatsapp.com/${code}`,
          chatId,
        }),
      };
    } catch (err: any) {
      return { success: false, output: '', error: `Failed to get invite link: ${err.message}` };
    }
  }

  private async markRead(input: Record<string, unknown>): Promise<ToolResult> {
    const client = getWAClient();
    if (!client) return { success: false, output: '', error: 'WhatsApp is not connected.' };

    const chatId = input.chatId as string | undefined;
    if (!chatId) return { success: false, output: '', error: 'chatId is required' };

    try {
      const chat = await client.getChatById(chatId);
      await chat.sendSeen();
      return { success: true, output: JSON.stringify({ marked: true, chatId }) };
    } catch (err: any) {
      return { success: false, output: '', error: `Failed to mark as read: ${err.message}` };
    }
  }

  private async setStatus(input: Record<string, unknown>): Promise<ToolResult> {
    const client = getWAClient();
    if (!client) return { success: false, output: '', error: 'WhatsApp is not connected.' };

    const status = input.status as string | undefined;
    if (!status) return { success: false, output: '', error: 'status text is required' };

    try {
      await client.setStatus(status);
      return { success: true, output: JSON.stringify({ updated: true, status }) };
    } catch (err: any) {
      return { success: false, output: '', error: `Failed to set status: ${err.message}` };
    }
  }

  private async reactMessage(input: Record<string, unknown>): Promise<ToolResult> {
    const client = getWAClient();
    if (!client) return { success: false, output: '', error: 'WhatsApp is not connected.' };

    const chatId = input.chatId as string | undefined;
    const messageId = input.messageId as string | undefined;
    const emoji = input.emoji as string | undefined;

    if (!chatId) return { success: false, output: '', error: 'chatId is required' };
    if (!messageId) return { success: false, output: '', error: 'messageId is required' };
    if (!emoji) return { success: false, output: '', error: 'emoji is required' };

    try {
      const chat = await client.getChatById(chatId);
      const msgs = await chat.fetchMessages({ limit: 100 });
      const target = msgs.find(m => m.id._serialized === messageId);
      if (!target) return { success: false, output: '', error: 'Message not found in last 100 messages' };
      await target.react(emoji);
      return { success: true, output: JSON.stringify({ reacted: true, chatId, messageId, emoji }) };
    } catch (err: any) {
      return { success: false, output: '', error: `Failed to react: ${err.message}` };
    }
  }

  private async addParticipants(input: Record<string, unknown>): Promise<ToolResult> {
    const client = getWAClient();
    if (!client) return { success: false, output: '', error: 'WhatsApp is not connected.' };

    const chatId = input.chatId as string | undefined;
    const participants = input.participants as string[] | undefined;
    if (!chatId) return { success: false, output: '', error: 'chatId is required' };
    if (!Array.isArray(participants) || participants.length === 0) return { success: false, output: '', error: 'participants must be a non-empty array' };

    try {
      const chat = await client.getChatById(chatId);
      if (!chat.isGroup) return { success: false, output: '', error: 'Chat is not a group' };
      if (!chat.addParticipants) return { success: false, output: '', error: 'addParticipants not supported' };
      await chat.addParticipants(participants);
      return { success: true, output: JSON.stringify({ added: true, chatId, participants }) };
    } catch (err: any) {
      return { success: false, output: '', error: `Failed to add participants: ${err.message}` };
    }
  }

  private async removeParticipants(input: Record<string, unknown>): Promise<ToolResult> {
    const client = getWAClient();
    if (!client) return { success: false, output: '', error: 'WhatsApp is not connected.' };

    const chatId = input.chatId as string | undefined;
    const participants = input.participants as string[] | undefined;
    if (!chatId) return { success: false, output: '', error: 'chatId is required' };
    if (!Array.isArray(participants) || participants.length === 0) return { success: false, output: '', error: 'participants must be a non-empty array' };

    try {
      const chat = await client.getChatById(chatId);
      if (!chat.isGroup) return { success: false, output: '', error: 'Chat is not a group' };
      if (!chat.removeParticipants) return { success: false, output: '', error: 'removeParticipants not supported' };
      await chat.removeParticipants(participants);
      return { success: true, output: JSON.stringify({ removed: true, chatId, participants }) };
    } catch (err: any) {
      return { success: false, output: '', error: `Failed to remove participants: ${err.message}` };
    }
  }

  private async promoteAdmin(input: Record<string, unknown>): Promise<ToolResult> {
    const client = getWAClient();
    if (!client) return { success: false, output: '', error: 'WhatsApp is not connected.' };

    const chatId = input.chatId as string | undefined;
    const participants = input.participants as string[] | undefined;
    if (!chatId) return { success: false, output: '', error: 'chatId is required' };
    if (!Array.isArray(participants) || participants.length === 0) return { success: false, output: '', error: 'participants must be a non-empty array' };

    try {
      const chat = await client.getChatById(chatId);
      if (!chat.isGroup) return { success: false, output: '', error: 'Chat is not a group' };
      if (!chat.promoteParticipants) return { success: false, output: '', error: 'promoteParticipants not supported' };
      await chat.promoteParticipants(participants);
      return { success: true, output: JSON.stringify({ promoted: true, chatId, participants }) };
    } catch (err: any) {
      return { success: false, output: '', error: `Failed to promote participants: ${err.message}` };
    }
  }

  private async demoteAdmin(input: Record<string, unknown>): Promise<ToolResult> {
    const client = getWAClient();
    if (!client) return { success: false, output: '', error: 'WhatsApp is not connected.' };

    const chatId = input.chatId as string | undefined;
    const participants = input.participants as string[] | undefined;
    if (!chatId) return { success: false, output: '', error: 'chatId is required' };
    if (!Array.isArray(participants) || participants.length === 0) return { success: false, output: '', error: 'participants must be a non-empty array' };

    try {
      const chat = await client.getChatById(chatId);
      if (!chat.isGroup) return { success: false, output: '', error: 'Chat is not a group' };
      if (!chat.demoteParticipants) return { success: false, output: '', error: 'demoteParticipants not supported' };
      await chat.demoteParticipants(participants);
      return { success: true, output: JSON.stringify({ demoted: true, chatId, participants }) };
    } catch (err: any) {
      return { success: false, output: '', error: `Failed to demote participants: ${err.message}` };
    }
  }

  private async renameGroup(input: Record<string, unknown>): Promise<ToolResult> {
    const client = getWAClient();
    if (!client) return { success: false, output: '', error: 'WhatsApp is not connected.' };

    const chatId = input.chatId as string | undefined;
    const name = input.name as string | undefined;
    if (!chatId) return { success: false, output: '', error: 'chatId is required' };
    if (!name) return { success: false, output: '', error: 'name is required' };

    try {
      const chat = await client.getChatById(chatId);
      if (!chat.isGroup) return { success: false, output: '', error: 'Chat is not a group' };
      if (!chat.setSubject) return { success: false, output: '', error: 'setSubject not supported' };
      await chat.setSubject(name);
      return { success: true, output: JSON.stringify({ renamed: true, chatId, name }) };
    } catch (err: any) {
      return { success: false, output: '', error: `Failed to rename group: ${err.message}` };
    }
  }

  private watcherStart(): ToolResult {
    const result = groupLinkWatcher.start();
    return { success: result.ok, output: JSON.stringify(result), error: result.ok ? undefined : result.message };
  }

  private watcherStop(): ToolResult {
    const result = groupLinkWatcher.stop();
    return { success: result.ok, output: JSON.stringify(result), error: result.ok ? undefined : result.message };
  }

  private watcherStatus(): ToolResult {
    return { success: true, output: JSON.stringify(groupLinkWatcher.getStatus()) };
  }

  private watcherReset(): ToolResult {
    groupLinkWatcher.reset();
    return { success: true, output: JSON.stringify({ ok: true, message: 'Watcher state reset' }) };
  }
}
