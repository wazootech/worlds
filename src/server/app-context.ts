import type { OxigraphService } from "#/worlds/service.ts";
import type { AccountsService } from "#/accounts/service.ts";
import type { LimitsService } from "#/limits/service.ts";
import type { UsageService } from "#/usage/service.ts";
import { SqliteOxigraphService } from "#/worlds/service-sqlite.ts";
import { SqliteAccountsService } from "#/accounts/service-sqlite.ts";
import { SqliteLimitsService } from "#/limits/service-sqlite.ts";
import { SqliteUsageService } from "#/usage/service-sqlite.ts";
import { openDatabase } from "#/core/database/database.ts";
import { systemSchema } from "#/core/database/system.ts";

export interface AppContext {
  oxigraphService: OxigraphService;
  accountsService: AccountsService;
  limitsService: LimitsService;
  usageService: UsageService;
}

export async function sqliteAppContext(dbPath: string): Promise<AppContext> {
  const db = await openDatabase(dbPath);
  await db.executeMultiple(systemSchema);

  return {
    oxigraphService: new SqliteOxigraphService(
      db,
      (id: string) => {
        if (dbPath === ":memory:") {
          return openDatabase(":memory:");
        }

        return openDatabase(`world_${id}.db`);
      },
    ),
    accountsService: new SqliteAccountsService(db),
    limitsService: new SqliteLimitsService(db),
    usageService: new SqliteUsageService(db),
  };
}
