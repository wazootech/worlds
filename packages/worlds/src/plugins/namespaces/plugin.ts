import { WORLDS, WORLDS_WORLD_SLUG } from "#/core/ontology.ts";
import type { WorldsInterface } from "#/core/types.ts";
import type { WorldsPlugin } from "../interface.ts";

/**
 * NamespacesPlugin injects namespace entities into the WORLDS world.
 * This is an opt-in plugin that must be explicitly composed.
 */
export class NamespacesPlugin implements WorldsPlugin {
  name = "namespaces";

  /**
   * initialize injects the namespace ontology into the WORLDS world.
   */
  async initialize(worlds: WorldsInterface): Promise<void> {
    await worlds.sparql({
      slug: WORLDS_WORLD_SLUG,
      query: `
        PREFIX worlds: <${WORLDS.NAMESPACE}>
        INSERT DATA {
          <${WORLDS.Namespace}> a <http://www.w3.org/2000/01/rdf-schema#Class> .
          
          <${WORLDS.belongsTo}> a <http://www.w3.org/1999/02/22-rdf-syntax-ns#Property> ;
            <http://www.w3.org/2000/01/rdf-schema#domain> <${WORLDS.Namespace}> ;
            <http://www.w3.org/2000/01/rdf-schema#range> <${WORLDS.Namespace}> .
            
          <${WORLDS.hasMember}> a <http://www.w3.org/1999/02/22-rdf-syntax-ns#Property> ;
            <http://www.w3.org/2000/01/rdf-schema#domain> <${WORLDS.Namespace}> ;
            <http://www.w3.org/2000/01/rdf-schema#range> <${WORLDS.User}> .
        }
      `,
    });
  }
}
