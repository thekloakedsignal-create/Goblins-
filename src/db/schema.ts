import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

// Users synchronized via Firebase Auth
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Artifacts Vault records (Permanent cave lore, relics, and codes)
export const artifacts = pgTable('artifacts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  type: text('type').notNull(), // lore | art | document | relic | code
  description: text('description').notNull(),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  tags: jsonb('tags').$type<string[]>().default([]),
  sizeKb: integer('size_kb').default(1),
  authorUid: text('author_uid'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Agent Jobs Pipeline records
export const agentJobs = pgTable('agent_jobs', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  agentId: text('agent_id').notNull(),
  agentName: text('agent_name').notNull(),
  agentRole: text('agent_role').notNull(),
  sectorId: text('sector_id').notNull(),
  priority: text('priority').notNull().default('NORMAL'),
  status: text('status').notNull().default('COMPLETED'),
  prompt: text('prompt').notNull(),
  inputData: text('input_data'),
  result: text('result'),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  artifacts: many(artifacts),
}));
