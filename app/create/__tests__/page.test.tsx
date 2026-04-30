import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CreatePage from "../page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

describe("CreatePage", () => {
  it("renders heading and pick button", () => {
    render(<CreatePage />);
    expect(screen.getByText(/smart import/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pick sprite sheet/i })).toBeInTheDocument();
  });
});
