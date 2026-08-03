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
      // width/height/loading/decoding are set by rewrite-images.ts and must
      // survive sanitization — they're what prevent layout shift and stop a
      // 50-image chapter from fetching every figure up front.
      img: ["src", "alt", "class", "width", "height", "loading", "decoding"],
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
