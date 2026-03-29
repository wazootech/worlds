import { accepts } from "@std/http/negotiation";

/**
 * Serialization represents a supported RDF serialization format.
 */
export interface Serialization {
  contentType: string;
  format: string;
}

/**
 * SERIALIZATIONS is the registry of supported RDF serialization formats.
 */
export const SERIALIZATIONS: Record<string, Serialization> = {
  "turtle": { contentType: "text/turtle", format: "Turtle" },
  "n-quads": { contentType: "application/n-quads", format: "N-Quads" },
  "n-triples": { contentType: "application/n-triples", format: "N-Triples" },
  "n3": { contentType: "text/n3", format: "N3" },
};

/**
 * DEFAULT_SERIALIZATION is the default RDF serialization format.
 */
export const DEFAULT_SERIALIZATION = SERIALIZATIONS["turtle"];

/**
 * negotiateSerialization selects the best RDF serialization for the request.
 */
export function negotiateSerialization(
  request: Request,
  defaultFormat = "turtle",
): Serialization {
  const supportedTypes = Object.values(SERIALIZATIONS).map((s) =>
    s.contentType
  );
  const preferred = accepts(request, ...supportedTypes);

  if (preferred) {
    return (
      Object.values(SERIALIZATIONS).find((s) => s.contentType === preferred) ??
        SERIALIZATIONS[defaultFormat]
    );
  }

  return SERIALIZATIONS[defaultFormat];
}

/**
 * getSerializationByFormat returns the serialization for a given format name.
 */
export function getSerializationByFormat(
  format: string,
): Serialization | undefined {
  return SERIALIZATIONS[format.toLowerCase()];
}

/**
 * getSerializationByContentType returns the serialization for a given content type.
 */
export function getSerializationByContentType(
  contentType: string,
): Serialization | undefined {
  return Object.values(SERIALIZATIONS).find((s) =>
    contentType.includes(s.contentType)
  );
}
