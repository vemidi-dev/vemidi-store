import { siteConfig } from "@/config/site";

type SocialNetworkKey = "instagram" | "facebook" | "tiktok" | "pinterest";

type SocialLinksProps = {
  variant?: "footer" | "topBar" | "contact";
  networks?: readonly SocialNetworkKey[];
  showHeading?: boolean;
  headingText?: string;
};

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M13.5 22v-8.2h2.8l.4-3.3h-3.2V8.5c0-.9.3-1.6 1.6-1.6h1.7V4.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7v3.3h2.9V22h3.6z" />
    </svg>
  );
}

function IconTikTok({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    </svg>
  );
}

function IconPinterest({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
    </svg>
  );
}

const SOCIAL_NETWORKS = [
  {
    key: "instagram" as const,
    label: "Instagram",
    ariaLabel: "Отворете Instagram профила",
    Icon: IconInstagram,
  },
  {
    key: "facebook" as const,
    label: "Facebook",
    ariaLabel: "Отворете Facebook страницата",
    Icon: IconFacebook,
  },
  {
    key: "tiktok" as const,
    label: "TikTok",
    ariaLabel: "Отворете TikTok профила",
    Icon: IconTikTok,
  },
  {
    key: "pinterest" as const,
    label: "Pinterest",
    ariaLabel: "Отворете Pinterest профила",
    Icon: IconPinterest,
  },
];

const DEFAULT_FOOTER_NETWORKS: readonly SocialNetworkKey[] = [
  "instagram",
  "facebook",
  "tiktok",
];

const TOP_BAR_NETWORKS: readonly SocialNetworkKey[] = [
  "instagram",
  "facebook",
  "tiktok",
  "pinterest",
];

const iconClassByVariant = {
  footer: "h-4 w-4",
  topBar: "h-4 w-4 shrink-0 opacity-90 transition-opacity duration-200 group-hover:opacity-100",
  contact: "h-4 w-4",
} as const;

export function SocialLinks({
  variant = "footer",
  networks,
  showHeading = variant === "footer",
  headingText = "Последвайте ни",
}: SocialLinksProps) {
  const social = siteConfig.topBar.social;
  const allowedNetworks =
    networks ??
    (variant === "topBar" ? TOP_BAR_NETWORKS : DEFAULT_FOOTER_NETWORKS);

  const activeNetworks = SOCIAL_NETWORKS.filter((network) => {
    if (!allowedNetworks.includes(network.key)) {
      return false;
    }

    const href = social[network.key]?.trim();
    return Boolean(href);
  });

  if (activeNetworks.length === 0) {
    return null;
  }

  if (variant === "contact") {
    return (
      <div className="flex flex-wrap justify-center gap-3">
        {activeNetworks.map((network) => {
          const Icon = network.Icon;
          const href = social[network.key]?.trim() ?? "";

          return (
            <a
              key={network.key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={network.ariaLabel}
              className="inline-flex items-center gap-2.5 rounded-full border border-boutique-line bg-white px-5 py-3 text-sm font-semibold text-boutique-ink shadow-boutique-sm transition hover:border-boutique-sage/40 hover:text-boutique-sage-deep"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{network.label}</span>
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <div className={variant === "topBar" ? "flex items-center gap-0.5" : "space-y-3"}>
      {showHeading && variant !== "topBar" ? (
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-boutique-rose-deep">
          {headingText}
        </p>
      ) : null}
      {showHeading && variant === "topBar" ? (
        <span className="mr-1 hidden text-boutique-on-sage/70 sm:inline">{headingText}</span>
      ) : null}
      <div
        className={
          variant === "topBar"
            ? "flex items-center gap-0.5"
            : "flex items-center gap-2.5"
        }
      >
        {activeNetworks.map((network) => {
          const Icon = network.Icon;
          const href = social[network.key]?.trim() ?? "";

          return (
            <a
              key={network.key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={network.ariaLabel}
              className={
                variant === "topBar"
                  ? "group grid h-8 w-8 place-items-center rounded-full text-boutique-on-sage transition hover:bg-white/10 hover:text-white"
                  : "grid h-9 w-9 place-items-center rounded-full border border-boutique-line/80 bg-white/70 text-boutique-muted transition hover:border-boutique-rose/40 hover:text-boutique-rose-deep"
              }
            >
              <Icon className={iconClassByVariant[variant]} />
            </a>
          );
        })}
      </div>
    </div>
  );
}
