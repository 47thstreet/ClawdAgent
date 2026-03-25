import type pkg from 'whatsapp-web.js';
type WAClient = InstanceType<typeof pkg.Client>;
import { Engine, IncomingMessage } from '../../core/engine.js';
import config from '../../config.js';
import logger from '../../utils/logger.js';
import { formatCostFooter } from '../../core/usage-tracker.js';
import { getRecommendation } from '../../services/event-recommender.js';

/** File extension → mimetype map for document handling */
const DOCUMENT_EXTS: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  csv: 'text/csv',
  md: 'text/markdown',
  json: 'application/json',
};

export function setupHandlers(client: WAClient, engine: Engine) {
  const adminIds = config.WHATSAPP_ADMIN_IDS;
  const ignoreIds = config.WHATSAPP_IGNORE_IDS ?? [];
  const denyByDefault = config.CHANNEL_SECURITY_MODE === 'allowlist';

  client.on('message', async (msg) => {
    if (msg.fromMe) return;

    // Ignore list — silently skip specific contacts/groups (e.g., family group)
    if (ignoreIds.length > 0) {
      const chatId = msg.from;
      if (ignoreIds.some(id => chatId === id)) {
        return; // Silently ignore — no response, no log
      }
    }

    // Allowlist guard — deny-by-default security (matches Telegram/Discord pattern)
    if (denyByDefault && adminIds.length > 0) {
      const senderId = msg.from.replace(/@c\.us$/, '');
      if (!adminIds.some(id => senderId === id || msg.from === id)) {
        logger.warn('Unauthorized WhatsApp access blocked', { from: msg.from });
        return;
      }
    }

    // In group chats, only respond when directly mentioned (@bot) or in DM
    const chat = await msg.getChat().catch(() => null);
    const isGroup = chat?.isGroup ?? false;
    if (isGroup) {
      const mentioned = msg.mentionedIds ?? [];
      const myNumber = (client.info?.wid as any)?._serialized as string | undefined;
      const wasMentioned = myNumber
        ? mentioned.some(id => id === myNumber)
        : false;
      // Also respond if the message starts with a command prefix
      const hasPrefix = msg.body.startsWith('!') || msg.body.startsWith('/');
      if (!wasMentioned && !hasPrefix) {
        // Party keyword auto-responder — reply with Kartis ticket link
        const PARTY_KEYWORDS = [
          // English
          'party', 'event', 'tonight', 'this weekend', 'thursday', 'friday', 'saturday',
          'club', 'nightlife', 'table', 'vip', 'bottle', 'guestlist', 'guest list', 'rsvp',
          'ticket', 'tickets', 'how much', 'buy ticket', 'where to buy',
          'thebestparties', 'kartis',
          // Hebrew
          'כרטיס', 'כרטיסים', 'טיקט', 'טיקטים', 'כמה עולה', 'כמה זה עולה',
          'מסיבה', 'אירוע', 'מסיבות', 'אירועים', 'הערב', 'סוף שבוע',
          'מועדון', 'שולחן', 'בקבוק', 'רשימת אורחים',
          'איפה קונים', 'איפה אפשר', 'קנות כרטיס', 'לקנות כרטיס',
        ];
        const bodyLower = msg.body.toLowerCase();
        const isPartyQuery = PARTY_KEYWORDS.some(kw => bodyLower.includes(kw.toLowerCase()));
        if (isPartyQuery) {
          logger.info('WhatsApp party keyword detected — fetching event recommendation', { group: chat?.name, from: msg.author ?? msg.from });
          try {
            const recommendation = await getRecommendation(msg.body);
            await msg.reply(recommendation);
          } catch (err: any) {
            logger.error('Event recommendation failed, sending fallback', { error: err.message });
            await msg.reply(
              '🎉 *כרטיסים לאירוע?*\n\nרכשו כרטיסים דרך אפליקציית *Kartis* ➡️ https://thebestparties.co.il\n\n_The Best Parties 🐙_'
            ).catch(() => {});
          }
        } else {
          logger.debug('WhatsApp group message (not mentioned, skipping)', {
            group: chat?.name,
            from: msg.author ?? msg.from,
          });
        }
        return;
      }
      // Strip the @mention from the body so the agent gets clean text
      if (wasMentioned && myNumber) {
        msg.body = msg.body.replace(/@\S+/g, '').trim();
      }
    }

    // --- Voice messages (push-to-talk) ---
    if (msg.hasMedia && msg.type === 'ptt') {
      try {
        const media = await msg.downloadMedia();
        if (!media) return;
        const buffer = Buffer.from(media.data, 'base64');
        const { transcribeAudio } = await import('../../actions/voice/stt.js');
        const text = await transcribeAudio(buffer, 'ogg');
        if (!text) { await msg.reply('Could not understand voice.'); return; }

        const contact = await msg.getContact();
        const incoming: IncomingMessage = {
          platform: 'whatsapp', userId: msg.from,
          userName: contact.pushname ?? contact.name ?? msg.from,
          chatId: msg.from, text, metadata: { originalType: 'voice' },
        };
        const response = await engine.process(incoming);
        await msg.reply(`_"${text}"_\n\n${response.text}`);
      } catch (err: any) {
        logger.error('WhatsApp voice failed', { error: err.message });
        await msg.reply('Voice processing failed.');
      }
      return;
    }

    // --- Image analysis ---
    if (msg.hasMedia && msg.type === 'image') {
      try {
        const media = await msg.downloadMedia();
        if (!media) return;
        const buffer = Buffer.from(media.data, 'base64');
        const { analyzeImage } = await import('../../actions/vision/analyze.js');
        const caption = msg.body || 'Describe this image.';
        const analysis = await analyzeImage(buffer, caption);
        await msg.reply(analysis);
      } catch (err: any) {
        logger.error('WhatsApp image failed', { error: err.message });
        await msg.reply('Image analysis failed.');
      }
      return;
    }

    // --- Document / file messages (PDF, DOCX, XLSX, TXT, CSV...) ---
    if (msg.hasMedia && msg.type === 'document') {
      try {
        const media = await msg.downloadMedia();
        if (!media) { await msg.reply('Could not download the file.'); return; }

        const filename = (media as any).filename as string | undefined ?? 'document';
        const ext = filename.split('.').pop()?.toLowerCase() ?? '';

        if (!DOCUMENT_EXTS[ext]) {
          await msg.reply(`File type ".${ext}" is not supported for processing.`);
          return;
        }

        const ragEngine = engine.getRAGEngine();
        if (ragEngine) {
          // Write to a temp file, ingest via RAG, then reply with summary
          const { writeFileSync, unlinkSync } = await import('fs');
          const { tmpdir } = await import('os');
          const { join } = await import('path');
          const { randomUUID } = await import('crypto');
          const tmpPath = join(tmpdir(), `wa-doc-${randomUUID()}.${ext}`);
          writeFileSync(tmpPath, Buffer.from(media.data, 'base64'));

          const contact = await msg.getContact().catch(() => null);
          const userId = msg.from;

          await msg.reply(`Processing "${filename}"… 📄`);
          let result: Awaited<ReturnType<typeof ragEngine.ingestDocument>>;
          try {
            result = await ragEngine.ingestDocument(tmpPath, userId);
          } finally {
            try { unlinkSync(tmpPath); } catch {}
          }

          const incoming: IncomingMessage = {
            platform: 'whatsapp',
            userId,
            userName: contact?.pushname ?? contact?.name ?? msg.from,
            chatId: msg.from,
            text: msg.body
              ? `${msg.body}\n\n[Document ingested: "${filename}" — ${result.chunks} chunks]`
              : `[Document "${filename}" was uploaded. ${result.chunks} chunks ingested. Please summarize or answer questions about this document.]`,
          };
          const response = await engine.process(incoming);
          await msg.reply(response.text);
        } else {
          await msg.reply(`Received "${filename}" but RAG is not enabled — cannot process documents.`);
        }
      } catch (err: any) {
        logger.error('WhatsApp document handling failed', { error: err.message });
        await msg.reply('Document processing failed.');
      }
      return;
    }

    // --- Stickers — acknowledge, don't process ---
    if (msg.hasMedia && msg.type === 'sticker') {
      return; // silently ignore stickers
    }

    // --- Text messages ---
    if (!msg.body) return; // Empty body — nothing to process

    try {
      const contact = await msg.getContact().catch(() => null);
      const incoming: IncomingMessage = {
        platform: 'whatsapp',
        userId: msg.from,
        userName: contact?.pushname ?? contact?.name ?? msg.from,
        chatId: msg.from,
        text: msg.body,
        ...(isGroup && { metadata: { group: chat?.name ?? 'unknown', groupId: chat?.id._serialized, author: msg.author ?? msg.from } }),
      };

      logger.debug('WhatsApp message', { from: msg.from, text: msg.body.slice(0, 50) });

      // Show typing indicator while processing
      if (chat) {
        await chat.sendStateTyping().catch((e: any) => {
          logger.debug('Failed to send typing state', { error: e?.message });
        });
      }

      const response = await engine.process(incoming);

      // Clear typing indicator
      if (chat) {
        await chat.clearState().catch((e: any) => {
          logger.debug('Failed to clear typing state', { error: e?.message });
        });
      }

      const costFooter = formatCostFooter(response.tokensUsed, response.provider, response.modelUsed, response.agentUsed, response.elapsed);
      await msg.reply(response.text + costFooter);
    } catch (err: any) {
      logger.error('WhatsApp message handler failed', { from: msg.from, error: err.message });
    }
  });

  // --- Message reactions (log only) ---
  client.on('message_reaction', (reaction: any) => {
    logger.debug('WhatsApp reaction received', {
      emoji: reaction.reaction,
      msgId: reaction.msgId?._serialized,
    });
  });
}
