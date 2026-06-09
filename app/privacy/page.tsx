import type { Metadata } from "next";

import {
  InformationPage,
  InformationSection,
} from "@/components/legal/information-page";

export const metadata: Metadata = {
  title: "Поверителност",
  description: "Как VeMiDi crafts използва данните, предоставени при изпращане на поръчка.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <InformationPage
      eyebrow="Лични данни"
      title="Поверителност"
      description="Използваме само информацията, необходима за обработване и доставка на поръчката."
    >
      <InformationSection title="Какви данни получаваме">
        <p>
          При поръчка получаваме име, телефон, по желание имейл, населено място,
          адрес или офис на куриер и предоставените от вас бележки.
        </p>
      </InformationSection>

      <InformationSection title="За какво ги използваме">
        <p>
          Данните се използват за потвърждение, изработка, доставка и обслужване на
          поръчката. Не ги използваме за плащане с карта и не продаваме лични данни.
        </p>
      </InformationSection>

      <InformationSection title="С кого се споделят">
        <p>
          Данни за получателя се предоставят на избрания куриер само доколкото са
          необходими за извършване на доставката. Техническите доставчици на сайта
          обработват информацията според предоставяните от тях услуги.
        </p>
      </InformationSection>

      <InformationSection title="Вашите въпроси">
        <p>
          Можете да поискате информация, корекция или изтриване на предоставени
          данни чрез обичайния канал, по който комуникирате с VeMiDi crafts.
          Данните за контакт и търговеца трябва да бъдат публикувани преди
          окончателното пускане на основния домейн.
        </p>
      </InformationSection>
    </InformationPage>
  );
}
