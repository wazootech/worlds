
/**
 * Serialization represents a supported RDF serialization format.
 */
export interface Serialization {
  /**
   * contentType is the HTTP Content-Type for the format.
   */
  contentType: string;

  /**
   * format is the name of the format for the N3 parser/writer.
   */
  format: string;
}

/**
 * SERIALIZATIONS is the registry of supported RDF serialization formats.
 */
export const SERIALIZATIONS: Record<string, Serialization> = {
  "text/turtle": { contentType: "text/turtle", format: "Turtle" },
  "application/n-quads": {
    contentType: "application/n-quads",
    format: "N-Quads",
  },
  "application/n-triples": {
    contentType: "application/n-triples",
    format: "N-Triples",
  },
  "text/n3": { contentType: "text/n3", format: "N3" },
};

/**
 * DEFAULT_SERIALIZATION is the default RDF serialization format.
 */
export const DEFAULT_SERIALIZATION = SERIALIZATIONS["text/turtle"];


/**
 * getSerializationByContentType returns the serialization for a given content type.
 */
export function getSerializationByContentType(
  contentType: string,
): Serialization | undefined {
  return SERIALIZATIONS[contentType.toLowerCase()] ||
    Object.values(SERIALIZATIONS).find((s) =>
      contentType.includes(s.contentType)
    );
}


