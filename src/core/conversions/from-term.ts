import type { Term } from "@rdfjs/types";

/**
 * TermValue represents the extracted value and metadata from an RDF Term.
 */
export interface TermValue {
  value: string;
  language?: string;
  datatype?: string;
}

/**
 * fromTerm extracts the string value and metadata from an RDF/JS Term.
 *
 * This function converts RDF Term types (NamedNode, BlankNode, Literal, DefaultGraph)
 * to their string representations for database storage.
 *
 * @param term - The RDF/JS Term to convert
 * @returns A TermValue object containing the string value and optional metadata
 *
 * @example
 * ```ts
 * const literalTerm = literal("Hello", "en");
 * const termValue = fromTerm(literalTerm);
 * // Returns: { value: "Hello", language: "en" }
 * ```
 */
export function fromTerm(term: Term): TermValue {
  switch (term.termType) {
    case "NamedNode": {
      return { value: term.value };
    }

    case "BlankNode": {
      return { value: term.value };
    }

    case "Literal": {
      return {
        value: term.value,
        language: (term as { language?: string }).language,
        datatype: (term as { datatype?: { value: string } }).datatype?.value,
      };
    }

    case "DefaultGraph": {
      return { value: "" };
    }

    default: {
      throw new Error(`Unknown term type: ${(term as Term).termType}`);
    }
  }
}
