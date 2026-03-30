import { createClient as createTursoClient } from "@tursodatabase/api";

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * Represents a provisioned Turso/libSQL database with connection details.
 */
export interface TursoDatabase {
  /** Database name (unique within the Turso organization). */
  name: string;
  /** Hostname for connecting via libsql:// protocol. */
  hostname: string;
  /** Auth token (JWT) for database access. */
  authToken: string;
  /** Full libsql:// connection URL. */
  url: string;
  /** Database group (defaults to "default"). */
  group?: string;
}

// ── Interface ──────────────────────────────────────────────────────────────

/**
 * TursoManager provides lifecycle management for Turso/libSQL databases
 * via the Turso Platform API. Used by the console to provision per-organization
 * databases before deployments.
 */
export interface TursoManager {
  /**
   * Provision a new libSQL database and generate an auth token.
   * @param name - Unique database name (typically the organization ID).
   * @param opts - Optional creation options.
   */
  createDatabase(
    name: string,
    opts?: { group?: string },
  ): Promise<TursoDatabase>;

  /**
   * Retrieve database info and generate a fresh auth token.
   */
  getDatabase(name: string): Promise<TursoDatabase>;

  /**
   * List all databases in the Turso organization.
   */
  listDatabases(): Promise<TursoDatabase[]>;

  /**
   * Delete a database by name.
   */
  deleteDatabase(name: string): Promise<void>;
}

// ── Implementation ─────────────────────────────────────────────────────────

type TursoClient = ReturnType<typeof createTursoClient>;

export class RemoteTursoManager implements TursoManager {
  private readonly client: TursoClient;

  constructor(private readonly config: { token: string; org: string }) {
    this.client = createTursoClient({
      token: config.token,
      org: config.org,
    });
  }

  async createDatabase(
    name: string,
    opts?: { group?: string },
  ): Promise<TursoDatabase> {
    const group = opts?.group ?? "default";

    console.log(
      `[turso] Creating database "${name}" in org "${this.config.org}" (group: ${group})...`,
    );

    const database = await this.client.databases.create(name, { group });
    const token = await this.client.databases.createToken(name);

    console.log(`[turso] Database "${name}" created: ${database.hostname}`);

    return {
      name: database.name ?? name,
      hostname: database.hostname,
      authToken: token.jwt,
      url: `libsql://${database.hostname}`,
      group,
    };
  }

  async getDatabase(name: string): Promise<TursoDatabase> {
    const database = await this.client.databases.get(name);
    const token = await this.client.databases.createToken(name);

    return {
      name: database.name ?? name,
      hostname: database.hostname,
      authToken: token.jwt,
      url: `libsql://${database.hostname}`,
      group: database.group,
    };
  }

  async listDatabases(): Promise<TursoDatabase[]> {
    const databases = await this.client.databases.list();

    return Promise.all(
      databases.map(async (db) => {
        const token = await this.client.databases.createToken(db.name);
        return {
          name: db.name,
          hostname: db.hostname,
          authToken: token.jwt,
          url: `libsql://${db.hostname}`,
          group: db.group,
        };
      }),
    );
  }

  async deleteDatabase(name: string): Promise<void> {
    console.log(
      `[turso] Deleting database "${name}" from org "${this.config.org}"...`,
    );
    await this.client.databases.delete(name);
    console.log(`[turso] Database "${name}" deleted.`);
  }

  getDatabaseUrl(name: string): string {
    // Convention: <db-name>-<org>.turso.io
    return `libsql://${name}-${this.config.org}.turso.io`;
  }
}
