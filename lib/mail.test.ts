import { describe, expect, it } from "vitest";
import { mailtoHref } from "./mail";

describe("mailtoHref", () => {
  it("encodes subject and body", () => {
    expect(mailtoHref("hi@x.com", "An idea worth shipping", "Rent & bills — \"fair\" splits 🙂"))
      .toBe("mailto:hi@x.com?subject=An%20idea%20worth%20shipping&body=Rent%20%26%20bills%20%E2%80%94%20%22fair%22%20splits%20%F0%9F%99%82");
  });
  it("keeps the address readable", () => expect(mailtoHref("a.b@c.io", "s", "b").startsWith("mailto:a.b@c.io?")).toBe(true));
});

describe("mailtoHref with a half-cut emoji", () => {
  it("does not throw on a lone surrogate and replaces it", () => {
    expect(() => mailtoHref("a@b.c", "s", "idea \uD83D")).not.toThrow();
    expect(mailtoHref("a@b.c", "s", "idea \uD83D")).toBe("mailto:a@b.c?subject=s&body=idea%20%EF%BF%BD");
  });
});
