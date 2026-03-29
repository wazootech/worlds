import type { Client } from "@libsql/client";
import {
  logsAdd,
  logsDeleteExpired,
  logsList,
  logsListSince,
} from "./queries.sql.ts";
import type { LogsTable, LogsTableInsert } from "./schema.ts";

/**
 * LogsRepository provides an interface for interacting with world logs in the database.
 */
export class LogsRepository {
  /**
   * constructor initializes the LogsRepository with a database client.
   * @param db The database client.
   */
  constructor(private readonly db: Client) {}

  /**
   * add inserts a new log entry into the database.
   * @param log The log entry to insert.
   */
  async add(log: LogsTableInsert): Promise<void> {
    await this.db.execute({
      sql: logsAdd,
      args: [
        log.id,
        log.world_id,
        log.timestamp,
        log.level.toUpperCase(),
        log.message,
        log.metadata ? JSON.stringify(log.metadata) : (null as string | null),
      ],
    });
  }

  /**
   * listByWorld retrieves a paginated list of logs for a specific world.
   * @param worldId The ID of the world whose logs to list.
   * @param page The page number (starting from 1).
   * @param pageSize The number of logs per page.
   * @param level Optional log level filter.
   * @returns A list of log table entries.
   */
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

  /**
   * listSince retrieves a list of logs generated since a specific timestamp.
   * @param sinceTimestamp The starting timestamp (Unix epoch).
   * @param limit The maximum number of logs to retrieve.
   * @returns A list of log table entries.
   */
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

  /**
   * deleteExpired removes logs that are older than the specified timestamp.
   * @param timestamp The expiration threshold (Unix epoch).
   */
  async deleteExpired(timestamp: number): Promise<void> {
    await this.db.execute({
      sql: logsDeleteExpired,
      args: [timestamp],
    });
  }
}
