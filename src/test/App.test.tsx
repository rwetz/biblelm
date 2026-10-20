import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "@/app/App";

afterEach(cleanup);

describe("App", () => {
  it("renders the shell", async () => {
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByRole("navigation")).toBeTruthy();
  });

  it.each(["Corpus", "Training", "Inference", "Ask", "Model"])(
    "opens the %s view without crashing",
    async (label) => {
      await act(async () => {
        render(<App />);
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: label }));
      });
      expect(screen.getByRole("button", { name: label }).getAttribute("aria-current")).toBe("page");
    },
  );
});
