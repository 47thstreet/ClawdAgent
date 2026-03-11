import QRCode from 'qrcode';
import pkg from 'whatsapp-web.js';
const { MessageMedia } = pkg as any;
import logger from '../../utils/logger.js';

// ---------------------------------------------------------------------------
// Shared WhatsApp auth state — accessed by client.ts and the web QR route
// ---------------------------------------------------------------------------

export type WhatsAppAuthStatus = 'waiting' | 'authenticated' | 'auth_failure' | 'disconnected';

/** A WhatsApp message (minimal fields we expose) */
export interface WAMessage {
  id: { _serialized: string };
  body: string;
  from: string;
  to: string;
  timestamp: number;
  type: string;
  /** In group chats, the participant who sent the message */
  author?: string;
  fromMe: boolean;
  hasMedia: boolean;
  mentionedIds?: string[];
  reply(text: string): Promise<unknown>;
  react(emoji: string): Promise<unknown>;
  downloadMedia(): Promise<{ data: string; mimetype: string; filename?: string } | null>;
}

/** A WhatsApp contact */
export interface WAContact {
  id: { _serialized: string };
  name?: string;
  pushname?: string;
  number: string;
  isGroup: boolean;
  isMe: boolean;
  isUser: boolean;
  isBusiness: boolean;
  isWAContact: boolean;
}

/** A WhatsApp chat/group */
export interface WAChat {
  id: { _serialized: string };
  name: string;
  isGroup: boolean;
  unreadCount: number;
  timestamp: number;
  archived: boolean;
  muted: boolean;
  participants?: Array<{
    id: { _serialized: string };
    isAdmin: boolean;
    isSuperAdmin: boolean;
  }>;
  fetchMessages(options: { limit: number }): Promise<WAMessage[]>;
  sendSeen(): Promise<void>;
  /** GroupChat only — get the invite code (part after https://chat.whatsapp.com/) */
  getInviteCode(): Promise<string>;
  /** GroupChat only — leave the group */
  leave(): Promise<void>;
  /** GroupChat only — add participants by ID or phone number */
  addParticipants?(ids: string[]): Promise<unknown>;
  /** GroupChat only — remove participants */
  removeParticipants?(ids: string[]): Promise<unknown>;
  /** GroupChat only — promote participants to admin */
  promoteParticipants?(ids: string[]): Promise<unknown>;
  /** GroupChat only — demote admins to regular participants */
  demoteParticipants?(ids: string[]): Promise<unknown>;
  /** GroupChat only — rename the group */
  setSubject?(subject: string): Promise<unknown>;
}

/** Minimal interface for the parts of WAClient we expose externally */
export interface WAClientHandle {
  getChats(): Promise<WAChat[]>;
  getChatById(chatId: string): Promise<WAChat>;
  sendMessage(chatId: string, content: string): Promise<unknown>;
  /** Join a group using an invite code (the part after https://chat.whatsapp.com/) */
  acceptInvite(inviteCode: string): Promise<string>;
  /** Fetch all contacts */
  getContacts(): Promise<WAContact[]>;
  /** Fetch a single contact by ID (e.g. "972501234567@c.us") */
  getContactById(contactId: string): Promise<WAContact>;
  /** Create a new WhatsApp group — returns the new group chat ID */
  createGroup(name: string, participants: string[]): Promise<string>;
  /** Set the WhatsApp account's status text */
  setStatus(status: string): Promise<void>;
  /** Send an image or file to a chat using base64-encoded data */
  sendMediaMessage(
    chatId: string,
    base64: string,
    mimetype: string,
    filename: string,
    caption?: string,
  ): Promise<unknown>;
}

/**
 * Wraps a raw whatsapp-web.js Client into our WAClientHandle interface,
 * providing type-safe access and adding the sendMediaMessage helper.
 */
export function createWAClientAdapter(rawClient: any): WAClientHandle {
  return {
    getChats: () => rawClient.getChats(),
    getChatById: (id: string) => rawClient.getChatById(id),
    sendMessage: (chatId: string, content: string) => rawClient.sendMessage(chatId, content),
    acceptInvite: (code: string) => rawClient.acceptInvite(code),
    getContacts: () => rawClient.getContacts(),
    getContactById: (id: string) => rawClient.getContactById(id),
    createGroup: async (name: string, participants: string[]): Promise<string> => {
      const result = await rawClient.createGroup(name, participants);
      return result?.gid?._serialized ?? result?.id?._serialized ?? '';
    },
    setStatus: (status: string) => rawClient.setStatus(status),
    sendMediaMessage: async (
      chatId: string,
      base64: string,
      mimetype: string,
      filename: string,
      caption?: string,
    ) => {
      const media = new MessageMedia(mimetype, base64, filename);
      return rawClient.sendMessage(chatId, media, caption ? { caption } : {});
    },
  };
}

/** Current authentication status */
let currentStatus: WhatsAppAuthStatus = 'disconnected';

/** Latest raw QR string (null when already authenticated or not yet received) */
let latestQR: string | null = null;

/** Live WAClient reference — set when ready, cleared on disconnect */
let waClient: WAClientHandle | null = null;

// ---------------------------------------------------------------------------
// Setters (called from WhatsAppClient lifecycle events)
// ---------------------------------------------------------------------------

export function setWhatsAppStatus(status: WhatsAppAuthStatus): void {
  currentStatus = status;
  logger.debug('WhatsApp auth status changed', { status });
}

export function setLatestQR(qr: string | null): void {
  latestQR = qr;
  if (qr) {
    logger.info('WhatsApp QR stored for web/Telegram retrieval');
  }
}

export function setWAClient(client: WAClientHandle | null): void {
  waClient = client;
}

// ---------------------------------------------------------------------------
// Getters (called from the web route / Telegram admin)
// ---------------------------------------------------------------------------

/** Return the current auth status */
export function getWhatsAppStatus(): WhatsAppAuthStatus {
  return currentStatus;
}

/** Return the raw QR string (to be rendered by the consumer) */
export function getLatestQR(): string | null {
  return latestQR;
}

/** Return the live WAClient handle (available only when authenticated+ready) */
export function getWAClient(): WAClientHandle | null {
  return waClient;
}

/**
 * Generate a data-URL PNG image of the current QR code.
 * Returns null when there is no QR pending.
 */
export async function generateQRDataURL(qr: string | null): Promise<string | null> {
  if (!qr) return null;

  try {
    return await QRCode.toDataURL(qr, { width: 300, margin: 2 });
  } catch {
    logger.error('Failed to generate QR data URL');
    return null;
  }
}

