import { describe, expect, it } from "vitest";
import { cartTotal, contactLink, submissionSchema, thankYouMessage } from "@/lib/wedding";

describe("wedding rules", () => {
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
