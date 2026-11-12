import { describe, expect, it } from "vitest";
import { crc16, pixPayload, cartTotal, contactLink, submissionSchema, thankYouMessage } from "@/lib/wedding";

describe("wedding rules", () => {
  it("crc16 matches CCITT-FALSE check value", () => { expect(crc16("123456789")).toBe("29B1"); });
  it("pix code carries the cart amount and key", () => {
    const c = pixPayload({ key: "noivos@email.com", type: "E-mail", name: "Helena & Rafael", city: "São Paulo", amount: 270 });
    expect(c).toContain("5406270.00");
    expect(c).toContain("0116noivos@email.com");
    expect(c.slice(-4)).toBe(crc16(c.slice(0, -4)));
  });
  it("sums the cart", () => {
    expect(cartTotal([{ id: "a", title: "A", price: 180 }, { id: "b", title: "B", price: 90 }])).toBe(270);
  });
  it("thank-you template names guest, gifts and couple", () => {
    expect(thankYouMessage("Marina", ["Jantar", "Barco"], { partner1: "Helena", partner2: "Rafael" })).toBe(
      "Olá Marina, recebemos seu presente (Jantar, Barco) e a mensagem linda no cartão postal! Muito obrigado pelo carinho com nosso casamento! — Helena e Rafael",
    );
  });
  it("phone contacts get Brazil prefix on WhatsApp", () => {
    expect(contactLink("(11) 98888-1111", "oi")).toBe("https://wa.me/5511988881111?text=oi");
  });
  it("email contacts open mail", () => {
    expect(contactLink("a@b.com", "oi").startsWith("mailto:a@b.com")).toBe(true);
  });
  it("rejects empty cart", () => {
    expect(submissionSchema.safeParse({ guest: "A", contact: "a@b.com", text: "oi", cardStyle: "floral", method: "Pix", items: [] }).success).toBe(false);
  });
});
