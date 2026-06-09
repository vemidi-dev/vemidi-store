import type { Metadata } from "next";

import { InformationPage, InformationSection } from "@/components/legal/information-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Политика за бисквитки",
  description: "Информация за техническите механизми и бисквитките в магазина VeMiDi crafts.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <InformationPage eyebrow="Настройки на сайта" title="Политика за бисквитки" description="Какви технически механизми използва магазинът и защо са необходими.">
      <p className="text-xs uppercase tracking-wider">Последна актуализация: 28 май 2026 г.</p>
      <InformationSection title="Какво са бисквитките">
        <p>Бисквитките и сходните технологии са малки записи в браузъра, които помагат на сайта да работи правилно и да запази необходимото състояние.</p>
      </InformationSection>
      <InformationSection title="Какво използва магазинът">
        <p>В момента се използват технически необходими механизми, включително за администраторска сесия, сигурност и запазване на количката в браузъра.</p>
      </InformationSection>
      <InformationSection title="Аналитика и реклама">
        <p>Към момента не са активирани рекламни или аналитични бисквитки като Meta Pixel или Google Analytics. Преди включването им тази политика и управлението на съгласието ще бъдат актуализирани.</p>
      </InformationSection>
      <InformationSection title="Контакт">
        <p>При въпроси пишете на <a href={`mailto:${siteConfig.business.email}`}>{siteConfig.business.email}</a>.</p>
      </InformationSection>
    </InformationPage>
  );
}
