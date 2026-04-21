import type { Patch, PatchHandler } from "./types.ts";

/**
 * BatchPatchHandler batches patches and only applies a batch sequence when commit is called.
 */
export class BatchPatchHandler implements PatchHandler {
  public readonly patches: Patch[] = [];

  /**
   * constructor initializes the BatchPatchHandler.
   * @param handler The underlying patch handler to commit to.
   */
  constructor(private readonly handler: PatchHandler) {}

  /**
   * patch adds patches to the current batch.
   * @param patches The patches to add.
   */
  public patch(patches: Patch[]): Promise<void> {
    this.patches.push(...patches);
    return Promise.resolve();
  }

  /**
   * commit applies the current batch to the underlying handler.
   */
  public async commit(): Promise<void> {
    if (this.patches.length > 0) {
      await this.handler.patch(this.patches);
    }
  }
}
