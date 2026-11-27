import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContactDetails } from "./ContactDetails";

describe("ContactDetails", () => {
  it("renders verified Oxford contact channels as clickable links", () => {
    render(<ContactDetails />);
    expect(
      screen.getByRole("link", { name: "+27 10 057 0991" }),
    ).toHaveAttribute("href", "tel:+27100570991");
    expect(
      screen.getByRole("link", { name: "+27 63 908 9071" }),
    ).toHaveAttribute("href", "https://wa.me/27639089071");
    expect(
      screen.getByRole("link", { name: "info@oxfordbusinessgroup.co.za" }),
    ).toHaveAttribute("href", "mailto:info@oxfordbusinessgroup.co.za");
    expect(
      screen.getByRole("link", { name: "apply@oxfordbusinessgroup.co.za" }),
    ).toHaveAttribute("href", "mailto:apply@oxfordbusinessgroup.co.za");
    expect(
      screen.getByRole("link", { name: "www.oxfordbusinessgroup.co.za" }),
    ).toHaveAttribute("href", "https://www.oxfordbusinessgroup.co.za");
  });

  it("keeps the compact footer view concise", () => {
    render(<ContactDetails compact />);
    expect(
      screen.getByRole("link", { name: "info@oxfordbusinessgroup.co.za" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "www.oxfordbusinessgroup.co.za" }),
    ).not.toBeInTheDocument();
  });
});
