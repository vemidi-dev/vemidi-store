import type { Metadata } from "next";

import {
  InformationPage,
  InformationSection,
} from "@/components/legal/information-page";

export const metadata: Metadata = {
  title: "Условия за поръчка",
  description: "Основни условия за поръчване на ръчно изработени изделия от VeMiDi crafts.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <InformationPage
      eyebrow="Информация за клиента"
      title="Условия за поръчка"
      description="Основни правила при поръчка на готови и персонализирани изделия."
    >
      <InformationSection title="Приемане на поръчката">
        <p>
          Изпращането на формата регистрира заявка. Поръчката се счита за потвърдена,
          след като уточним наличността, персонализацията, срока и данните за доставка.
        </p>
      </InformationSection>

      <InformationSection title="Персонализирани изделия">
        <p>
          Клиентът носи отговорност за точността на предоставените имена, дати и
          текстове. Преди изработка може да бъде поискано допълнително потвърждение.
        </p>
      </InformationSection>

      <InformationSection title="Цена">
        <p>
          Цената на продуктите се показва преди изпращане на поръчката. Разходът за
          куриерска доставка не е включен, освен ако изрично не е посочено друго.
        </p>
      </InformationSection>

      <InformationSection title="Проблем с поръчка">
        <p>
          При повреда, несъответствие или друг проблем се свържете с нас възможно
          най-скоро и запазете продукта и опаковката до уточняване на случая.
          Данните за търговеца и контакт трябва да бъдат добавени преди окончателното
          пускане на основния домейн.
        </p>
      </InformationSection>
    </InformationPage>
  );
}
