import type { Patch, PatchHandler } from "./types.ts";

/**
 * BatchPatchHandler batches patches and only applies a batch sequence when commit is called.
 */
export class BatchPatchHandler implements PatchHandler {
  private patches: Patch[] = [];

  constructor(private readonly handler: PatchHandler) {}

  public patch(patches: Patch[]): Promise<void> {
    this.patches.push(...patches);
    return Promise.resolve();
  }

  public async commit(): Promise<void> {
    if (this.patches.length > 0) {
      await this.handler.patch(this.patches);
    }
  }
}
