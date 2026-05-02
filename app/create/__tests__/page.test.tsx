import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CreatePage from "../page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

describe("CreatePage", () => {
  it("renders heading and pick button", () => {
    render(<CreatePage />);
    expect(screen.getAllByText(/smart import/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/drop a sprite sheet here/i)).toBeInTheDocument();
  });
});
