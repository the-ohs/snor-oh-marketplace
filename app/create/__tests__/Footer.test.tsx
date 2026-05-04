import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Footer } from "../Footer";

describe("Footer", () => {
  it("disables Save when canSave=false", () => {
    render(<Footer canSave={false} busy={false} onDownload={() => {}} onPublish={() => {}} />);
    expect(screen.getByRole("button", { name: /download/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /publish/i })).toBeDisabled();
  });

  it("calls onDownload on click", () => {
    const onDownload = vi.fn();
    render(<Footer canSave busy={false} onDownload={onDownload} onPublish={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /download/i }));
    expect(onDownload).toHaveBeenCalled();
  });

  it("calls onPublish directly on click", () => {
    const onPublish = vi.fn();
    render(<Footer canSave busy={false} onDownload={() => {}} onPublish={onPublish} />);
    fireEvent.click(screen.getByRole("button", { name: /publish/i }));
    expect(onPublish).toHaveBeenCalledTimes(1);
  });
});
