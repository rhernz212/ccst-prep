import sanitizeHtml from "sanitize-html";

/**
 * Allowlist for ingested textbook HTML. The source epub is trusted, but we
 * sanitize anyway (defense in depth) since sections are rendered client-side
 * via dangerouslySetInnerHTML. Keeps only the structural classes we style
 * against (see app/globals.css / prose overrides).
 */
export function sanitizeChapterHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "b", "i", "em", "strong", "u", "sub", "sup", "br", "hr",
      "ul", "ol", "li",
      "table", "thead", "tbody", "tr", "th", "td",
      "figure", "figcaption", "img",
      "a", "code", "pre", "span", "div",
      "h1", "h2", "h3", "h4",
      "aside", "section",
    ],
    allowedAttributes: {
      a: ["href"],
      img: ["src", "alt", "class"],
      "*": ["class", "id"],
      table: ["border"],
      th: ["scope"],
    },
    allowedClasses: {
      "*": [
        "feature3", "figureLabel", "center",
        "upper-alpha", "square", "square1", "check",
        "chapterNumber", "chapterTitle",
        "top", "bottom", "hr",
      ],
    },
    allowedSchemes: ["http", "https"],
    // Drop epub-only attributes (epub:type, role, aria-*, xmlns) entirely by
    // virtue of not being in allowedAttributes.
    disallowedTagsMode: "discard",
  });
}
