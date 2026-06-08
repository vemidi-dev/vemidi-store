export const siteConfig = {
  name: "LumaForge Gifts",
  description:
    "Personalized laser-cut and engraved gifts crafted for weddings, milestones, and thoughtful everyday moments.",
  footerLinks: [
    { href: "/products", label: "Shop Collection" },
    { href: "/checkout", label: "Checkout" },
    { href: "/login", label: "Sign In" },
  ],
  /** Utility bar: replace labels/hrefs with your real contact details and profile URLs. */
  topBar: {
    email: { label: "info@vemidi.bg", href: "mailto:info@vemidi.bg" },
    phone: { label: "+359 888 000 000", href: "tel:+359888000000" },
    social: {
      instagram: "https://www.instagram.com/",
      facebook: "https://www.facebook.com/",
      /** Optional: set to a full URL to show a Pinterest icon, or leave empty to hide. */
      pinterest: "",
    },
  },
} as const;
