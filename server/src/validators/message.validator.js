const { z } = require('zod');

const sendMessageSchema = z.object({
  ciphertext: z.string().min(1),
  iv: z.string().min(1),
  type: z.enum(['text', 'image', 'file', 'audio']).default('text'),
  replyTo: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional()
});

module.exports = {
  sendMessageSchema
};
