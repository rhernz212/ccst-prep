import { describe, expect, it } from "vitest";
import { splitHighlights } from "@/components/search/SearchPalette";
import { HIGHLIGHT_END, HIGHLIGHT_START } from "@/lib/search/types";

const wrap = (text: string) => `${HIGHLIGHT_START}${text}${HIGHLIGHT_END}`;

describe("splitHighlights", () => {
  it("returns plain text as a single unhighlighted run", () => {
    expect(splitHighlights("a subnet mask")).toEqual([
      { text: "a subnet mask", highlighted: false },
    ]);
  });

  it("splits a highlighted match out of its surroundings", () => {
    expect(splitHighlights(`the ${wrap("subnet")} mask`)).toEqual([
      { text: "the ", highlighted: false },
      { text: "subnet", highlighted: true },
      { text: " mask", highlighted: false },
    ]);
  });

  it("handles several matches", () => {
    expect(splitHighlights(`${wrap("TCP")} and ${wrap("UDP")}`)).toEqual([
      { text: "TCP", highlighted: true },
      { text: " and ", highlighted: false },
      { text: "UDP", highlighted: true },
    ]);
  });

  it("emits no empty runs when a match starts or ends the snippet", () => {
    const segments = splitHighlights(`${wrap("OSI")}`);
    expect(segments).toEqual([{ text: "OSI", highlighted: true }]);
    expect(segments.every((segment) => segment.text !== "")).toBe(true);
  });

  /** ts_headline shouldn't produce this, but a truncated snippet must not
   *  silently lose the tail. */
  it("keeps the text of an unterminated marker rather than dropping it", () => {
    expect(splitHighlights(`the ${HIGHLIGHT_START}subnet mask`)).toEqual([
      { text: "the ", highlighted: false },
      { text: "subnet mask", highlighted: false },
    ]);
  });

  it("never treats book prose containing angle brackets as markup", () => {
    // The whole reason the markers are plain text: this has to survive intact.
    const segments = splitHighlights(`when ${wrap("a < b")} holds`);
    expect(segments[1]).toEqual({ text: "a < b", highlighted: true });
  });
});
