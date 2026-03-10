import type { CallerProfile, CallerContext } from "@stem-agent/shared";
import type { IUserContextStore } from "../types.js";

/**
 * In-memory store for user profiles and session contexts.
 * Provides multi-tenant isolation by keying on callerId.
 */
export class InMemoryUserContextStore implements IUserContextStore {
  private readonly profiles = new Map<string, CallerProfile>();
  private readonly sessions = new Map<string, CallerContext>();

  private sessionKey(callerId: string, sessionId: string): string {
    return `${callerId}:${sessionId}`;
  }

  async getProfile(callerId: string): Promise<CallerProfile | null> {
    return this.profiles.get(callerId) ?? null;
  }

  async upsertProfile(profile: CallerProfile): Promise<void> {
    this.profiles.set(profile.callerId, profile);
  }

  async deleteProfile(callerId: string): Promise<void> {
    this.profiles.delete(callerId);
  }

  async getSession(
    callerId: string,
    sessionId: string,
  ): Promise<CallerContext | null> {
    return this.sessions.get(this.sessionKey(callerId, sessionId)) ?? null;
  }

  async upsertSession(context: CallerContext): Promise<void> {
    this.sessions.set(
      this.sessionKey(context.callerId, context.sessionId),
      context,
    );
  }

  async deleteAllForCaller(callerId: string): Promise<void> {
    this.profiles.delete(callerId);
    for (const [key] of this.sessions) {
      if (key.startsWith(`${callerId}:`)) {
        this.sessions.delete(key);
      }
    }
  }
}
