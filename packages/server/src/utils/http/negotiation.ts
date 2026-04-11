import { accepts } from "@std/http/negotiation";
import {
  SERIALIZATIONS,
  type Serialization,
} from "@wazoo/worlds-sdk";

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

  return (SERIALIZATIONS as any)[defaultContentType] || SERIALIZATIONS["text/turtle"];
}


