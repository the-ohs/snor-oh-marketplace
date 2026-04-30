import { describe, expect, it } from "vitest";
import { parseFrameInput } from "./parseFrameInput";

describe("parseFrameInput", () => {
  it("parses single number", () => {
    expect(parseFrameInput("3", 10)).toEqual([2]);
  });

  it("parses ascending range", () => {
    expect(parseFrameInput("1-5", 10)).toEqual([0, 1, 2, 3, 4]);
  });

  it("parses reverse range (ping-pong)", () => {
    expect(parseFrameInput("3-1", 10)).toEqual([2, 1, 0]);
  });

  it("parses comma list", () => {
    expect(parseFrameInput("1,3,5", 10)).toEqual([0, 2, 4]);
  });

  it("parses mixed list with ranges", () => {
    expect(parseFrameInput("1-3,5,7-9", 10)).toEqual([0, 1, 2, 4, 6, 7, 8]);
  });

  it("preserves duplicates", () => {
    expect(parseFrameInput("1,1,1", 10)).toEqual([0, 0, 0]);
  });

  it("supports ping-pong like 1-3,3-1", () => {
    expect(parseFrameInput("1-3,3-1", 10)).toEqual([0, 1, 2, 2, 1, 0]);
  });

  it("drops out-of-bounds", () => {
    expect(parseFrameInput("1-5", 3)).toEqual([0, 1, 2]);
    expect(parseFrameInput("0,4", 3)).toEqual([]);
  });

  it("trims whitespace", () => {
    expect(parseFrameInput(" 1 - 3 , 5 ", 10)).toEqual([0, 1, 2, 4]);
  });

  it("returns [] for empty input", () => {
    expect(parseFrameInput("", 10)).toEqual([]);
  });

  it("returns [] for garbage", () => {
    expect(parseFrameInput("abc,xyz", 10)).toEqual([]);
  });
});
