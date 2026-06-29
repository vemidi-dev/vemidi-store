import Script from "next/script";

/**
 * Runs before interactive so Google tags always start in Consent Mode v2 default denied.
 */
export function GoogleConsentModeBootstrap() {
  return (
    <Script id="google-consent-mode-default" strategy="beforeInteractive">
      {`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        window.gtag = gtag;
        gtag('consent', 'default', {
          analytics_storage: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          wait_for_update: 500
        });
      `}
    </Script>
  );
}
