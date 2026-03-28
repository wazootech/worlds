import type { Client } from "@libsql/client";
import {
  logsAdd,
  logsDeleteExpired,
  logsList,
  logsListSince,
} from "./queries.sql.ts";
import type { LogsTable, LogsTableInsert } from "./schema.ts";

// TODO: Add JSDoc to each exported symbol.

export class LogsRepository {
  constructor(private readonly db: Client) {}

  async add(log: LogsTableInsert): Promise<void> {
    await this.db.execute({
      sql: logsAdd,
      args: [
        log.id,
        log.world_id,
        log.timestamp,
        log.level.toUpperCase(),
        log.message,
        log.metadata ? JSON.stringify(log.metadata) : null,
      ],
    });
  }

  async listByWorld(
    worldId: string,
    page: number = 1,
    pageSize: number = 50,
    level?: string,
  ): Promise<LogsTable[]> {
    const offset = (page - 1) * pageSize;
    const levelParam = level ? level.toUpperCase() : null;
    const result = await this.db.execute({
      sql: logsList,
      args: [worldId, levelParam, levelParam, pageSize, offset],
    });
    return (result.rows as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      world_id: row.world_id as string,
      timestamp: row.timestamp as number,
      level: ((row.level ?? row.LEVEL) as string)
        .toLowerCase() as LogsTable["level"],
      message: row.message as string,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : null,
    }));
  }

  async listSince(sinceTimestamp: number, limit: number): Promise<LogsTable[]> {
    const result = await this.db.execute({
      sql: logsListSince,
      args: [sinceTimestamp, limit],
    });
    return (result.rows as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      world_id: row.world_id as string,
      timestamp: row.timestamp as number,
      level: ((row.level ?? row.LEVEL) as string)
        .toLowerCase() as LogsTable["level"],
      message: row.message as string,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : null,
    }));
  }

  async deleteExpired(timestamp: number): Promise<void> {
    await this.db.execute({
      sql: logsDeleteExpired,
      args: [timestamp],
    });
  }
}
