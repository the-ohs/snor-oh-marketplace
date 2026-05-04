import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FrameGrid } from "../FrameGrid";

function stubCanvas(): HTMLCanvasElement {
  return document.createElement("canvas");
}

describe("FrameGrid", () => {
  it("renders one tile per preview", () => {
    const previews = [stubCanvas(), stubCanvas(), stubCanvas()];
    render(<FrameGrid previews={previews} onDelete={() => {}} onMove={() => {}} />);
    expect(screen.getAllByRole("listitem").length).toBe(3);
  });

  it("invokes onDelete when delete button clicked", () => {
    const previews = [stubCanvas(), stubCanvas()];
    const onDelete = vi.fn();
    render(<FrameGrid previews={previews} onDelete={onDelete} onMove={() => {}} />);
    const buttons = screen.getAllByRole("button", { name: /delete frame/i });
    fireEvent.click(buttons[1]);
    expect(onDelete).toHaveBeenCalledWith(1);
  });
});
