import { db } from './index.ts';
import { artifacts, agentJobs, users } from './schema.ts';
import { desc, eq } from 'drizzle-orm';
import { Artifact, AgentJob } from '../types.ts';

// Artifacts query layer
export async function getArtifactsFromDb(): Promise<Artifact[]> {
  try {
    const rows = await db.select().from(artifacts).orderBy(desc(artifacts.createdAt));
    return rows.map(r => ({
      id: r.id,
      title: r.title,
      type: r.type as any,
      description: r.description,
      content: r.content,
      imageUrl: r.imageUrl || undefined,
      tags: (r.tags as string[]) || [],
      sizeKb: r.sizeKb || 1,
      createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString()
    }));
  } catch (error) {
    console.error("Database query failed for artifacts:", error);
    throw new Error("Failed to query artifacts from Cloud SQL database.", { cause: error });
  }
}

export async function saveArtifactToDb(artifact: Artifact, authorUid?: string): Promise<Artifact> {
  try {
    await db.insert(artifacts)
      .values({
        id: artifact.id,
        title: artifact.title,
        type: artifact.type,
        description: artifact.description,
        content: artifact.content,
        imageUrl: artifact.imageUrl || null,
        tags: artifact.tags || [],
        sizeKb: artifact.sizeKb || 1,
        authorUid: authorUid || null,
      })
      .onConflictDoUpdate({
        target: artifacts.id,
        set: {
          title: artifact.title,
          type: artifact.type,
          description: artifact.description,
          content: artifact.content,
          imageUrl: artifact.imageUrl || null,
          tags: artifact.tags || [],
          sizeKb: artifact.sizeKb || 1,
        }
      });
    return artifact;
  } catch (error) {
    console.error("Database upsert failed for artifact:", error);
    throw new Error("Failed to save artifact to Cloud SQL database.", { cause: error });
  }
}

// Jobs query layer
export async function getJobsFromDb(): Promise<AgentJob[]> {
  try {
    const rows = await db.select().from(agentJobs).orderBy(desc(agentJobs.createdAt));
    return rows.map(r => ({
      id: r.id,
      title: r.title,
      agentId: r.agentId,
      agentName: r.agentName,
      agentRole: r.agentRole as any,
      sectorId: r.sectorId,
      priority: (r.priority as any) || 'NORMAL',
      status: (r.status as any) || 'COMPLETED',
      prompt: r.prompt,
      inputData: r.inputData || undefined,
      result: r.result || undefined,
      durationMs: r.durationMs || undefined,
      createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
      logs: []
    }));
  } catch (error) {
    console.error("Database query failed for jobs:", error);
    throw new Error("Failed to query jobs from Cloud SQL database.", { cause: error });
  }
}

export async function saveJobToDb(job: AgentJob): Promise<AgentJob> {
  try {
    await db.insert(agentJobs)
      .values({
        id: job.id,
        title: job.title,
        agentId: job.agentId,
        agentName: job.agentName,
        agentRole: job.agentRole,
        sectorId: job.sectorId,
        priority: job.priority,
        status: job.status,
        prompt: job.prompt,
        inputData: job.inputData || null,
        result: job.result || null,
        durationMs: job.durationMs || null,
      })
      .onConflictDoUpdate({
        target: agentJobs.id,
        set: {
          status: job.status,
          result: job.result || null,
          durationMs: job.durationMs || null,
        }
      });
    return job;
  } catch (error) {
    console.error("Database upsert failed for job:", error);
    throw new Error("Failed to save job to Cloud SQL database.", { cause: error });
  }
}

// Users query layer
export async function getOrCreateUser(uid: string, email: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error("Database upsert failed for user:", error);
    throw new Error("Failed to register/sync user profile in Cloud SQL database.", { cause: error });
  }
}
