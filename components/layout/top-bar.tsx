import { PageContainer } from "@/components/layout/page-container";
import { SocialLinks } from "@/components/layout/social-links";
import { siteConfig } from "@/config/site";

export function TopBar() {
  const { topBar } = siteConfig;

  return (
    <div className="border-b border-white/10 bg-boutique-sage text-boutique-on-sage">
      <PageContainer>
        <div className="flex flex-col gap-2 py-2 text-[0.7rem] font-medium tracking-wide sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-2.5 sm:text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 sm:gap-x-6">
            <span>{topBar.message}</span>
            <span className="hidden text-boutique-on-sage/40 sm:inline" aria-hidden>
              |
            </span>
            <span className="hidden sm:inline">{topBar.secondary}</span>
          </div>

          <div className="flex items-center gap-1 sm:justify-end">
            <SocialLinks variant="topBar" showHeading headingText="Последвайте ни" />
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
