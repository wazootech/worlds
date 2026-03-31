import { accepts } from "@std/http/negotiation";

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
 * negotiateSerialization selects the best RDF serialization for the request.
 * @param request The HTTP request.
 * @param defaultContentType The default content type if negotiation fails.
 * @returns The selected serialization.
 */
export function negotiateSerialization(
  request: Request,
  defaultContentType = "text/turtle",
): Serialization {
  const supportedTypes = Object.values(SERIALIZATIONS).map((s) =>
    s.contentType
  );
  const preferred = accepts(request, ...supportedTypes);

  if (preferred) {
    return (
      Object.values(SERIALIZATIONS).find((s) => s.contentType === preferred) ??
        SERIALIZATIONS[defaultContentType]
    );
  }

  return SERIALIZATIONS[defaultContentType];
}

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
