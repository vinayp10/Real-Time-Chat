const { z } = require('zod');

const createGroupSchema = z.object({
  participants: z.array(z.string()).min(1).max(49),
  groupName: z.string().min(1).max(50),
  encryptedGroupKeys: z.array(z.object({
    user: z.string(),
    encryptedKey: z.string(),
    iv: z.string()
  })).min(1)
});

const updateGroupSchema = z.object({
  groupName: z.string().min(1).max(50).optional(),
  groupAvatar: z.string().url().optional()
});

const addMembersSchema = z.object({
  participants: z.array(z.string()).min(1),
  encryptedGroupKeys: z.array(z.object({
    user: z.string(),
    encryptedKey: z.string(),
    iv: z.string()
  })).min(1)
});

const updateKeysSchema = z.object({
  encryptedGroupKeys: z.array(z.object({
    user: z.string(),
    encryptedKey: z.string(),
    iv: z.string()
  })).min(1)
});

module.exports = {
  createGroupSchema,
  updateGroupSchema,
  addMembersSchema,
  updateKeysSchema
};
