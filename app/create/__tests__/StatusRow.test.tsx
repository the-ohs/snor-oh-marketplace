import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StatusRow } from "../StatusRow";

describe("StatusRow", () => {
  it("renders label, input, badge", () => {
    const setInput = vi.fn();
    render(
      <StatusRow
        status="idle"
        value="1-3"
        previews={[]}
        maxFrames={5}
        onSetInput={setInput}
        onDeleteFromStatus={() => {}}
        onMoveInStatus={() => {}}
      />
    );
    expect(screen.getByText("idle")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1-3")).toBeInTheDocument();
    expect(screen.getByText("3f")).toBeInTheDocument();
  });

  it("calls onSetInput on typing", () => {
    const setInput = vi.fn();
    render(
      <StatusRow
        status="idle"
        value=""
        previews={[]}
        maxFrames={5}
        onSetInput={setInput}
        onDeleteFromStatus={() => {}}
        onMoveInStatus={() => {}}
      />
    );
    const input = screen.getByPlaceholderText(/e\.g\./i);
    fireEvent.change(input, { target: { value: "1-5" } });
    expect(setInput).toHaveBeenCalledWith("idle", "1-5");
  });
});
