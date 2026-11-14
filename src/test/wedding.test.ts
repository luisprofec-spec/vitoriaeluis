import { describe, expect, it } from "vitest";
import { crc16, pixPayload, cartTotal, contactLink, submissionSchema, thankYouMessage } from "@/lib/wedding";

describe("wedding rules", () => {
  it("crc16 matches CCITT-FALSE check value", () => { expect(crc16("123456789")).toBe("29B1"); });
  it("pix code carries the cart amount and key", () => {
    const c = pixPayload({ key: "noivos@email.com", type: "E-mail", name: "Vitória & Luis", city: "São Paulo", amount: 270 });
    expect(c).toContain("5406270.00");
    expect(c).toContain("0116noivos@email.com");
    expect(c.slice(-4)).toBe(crc16(c.slice(0, -4)));
  });
  it("sums the cart", () => {
    expect(cartTotal([{ id: "a", title: "A", price: 180 }, { id: "b", title: "B", price: 90 }])).toBe(270);
  });
  it("thank-you template names guest, gifts and couple", () => {
    expect(thankYouMessage("Marina", ["Jantar", "Barco"], { partner1: "Vitória", partner2: "Luis" })).toBe(
      "Olá Marina, recebemos seu presente (Jantar, Barco) e a mensagem linda no cartão postal! Muito obrigado pelo carinho com nosso casamento! — Vitória e Luis",
    );
  });
  it("phone contacts get Brazil prefix on WhatsApp", () => {
    expect(contactLink("(11) 98888-1111", "oi")).toBe("https://wa.me/5511988881111?text=oi");
  });
  it("email contacts open mail", () => {
    expect(contactLink("a@b.com", "oi").startsWith("mailto:a@b.com")).toBe(true);
  });
  it("rejects empty cart", () => {
    expect(submissionSchema.safeParse({ id: "71b5938f-e4bd-4845-b419-a4e0fedd7156", paid: true, guest: "A", contact: "a@b.com", text: "oi", cardStyle: "floral", method: "Pix", items: [] }).success).toBe(false);
  });
  it("sanitizes Pix city to uppercase ASCII with at most 15 characters", () => {
    const code = pixPayload({ key: "a@b.com", type: "E-mail", name: "Casal", city: "São José dos Campos", amount: 270 });
    expect(code).toContain("6015SAO JOSE DOS CA");
    expect(code).not.toContain("São");
  });
  it("requires explicit visitor payment confirmation", () => {
    const input = { id: "71b5938f-e4bd-4845-b419-a4e0fedd7156", guest: "Visitante Livre", cardStyle: "floral", method: "Pix", items: [{ id: "gift", title: "Presente", price: 270 }] };
    expect(submissionSchema.safeParse(input).success).toBe(false);
    expect(submissionSchema.safeParse({ ...input, paid: true }).success).toBe(true);
  });
  it("permits gifting without RSVP membership, contact or message", () => {
    const input = { id: "71b5938f-e4bd-4845-b419-a4e0fedd7156", paid: true, guest: "Visitante não cadastrado", cardStyle: "floral", method: "Pix", items: [{ id: "gift", title: "Presente", price: 270 }] };
    expect(submissionSchema.parse(input).contact).toBe("");
    expect(submissionSchema.parse(input).text).toBe("");
  });
});
