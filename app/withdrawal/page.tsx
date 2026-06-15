import type { Metadata } from "next";
import Link from "next/link";

import {
  InformationPage,
  InformationSection,
} from "@/components/legal/information-page";
import {
  WithdrawalForm,
  WithdrawalIntroLinks,
} from "@/components/withdrawal/withdrawal-form";
import {
  WITHDRAWAL_LEGAL_NOTICE,
  WITHDRAWAL_LEGAL_REVIEW_NOTICE,
  WITHDRAWAL_PAGE_ROBOTS,
} from "@/lib/withdrawal/constants";

export const metadata: Metadata = {
  title: "Отказ от договор",
  description:
    "Подайте заявление за отказ от договор за онлайн поръчка от VeMiDi crafts.",
  alternates: { canonical: "/withdrawal" },
  robots: WITHDRAWAL_PAGE_ROBOTS,
};

export default function WithdrawalPage() {
  return (
    <InformationPage
      eyebrow="Потребителски права"
      title="Отказ от договор"
      description="Подайте заявление за отказ от договор за онлайн поръчка. Това е различно от рекламация за дефект или несъответствие."
    >
      <WithdrawalIntroLinks />

      <InformationSection title="Персонализирани продукти">
        <p>{WITHDRAWAL_LEGAL_NOTICE}</p>
        <p className="text-xs italic text-boutique-muted">
          {WITHDRAWAL_LEGAL_REVIEW_NOTICE}
        </p>
      </InformationSection>

      <InformationSection title="Формуляр">
        <WithdrawalForm />
      </InformationSection>

      <p className="text-sm text-boutique-muted">
        За рекламации и връщане при дефект вижте{" "}
        <Link className="font-semibold text-boutique-ink underline" href="/returns">
          Връщане и рекламации
        </Link>
        .
      </p>
    </InformationPage>
  );
}
