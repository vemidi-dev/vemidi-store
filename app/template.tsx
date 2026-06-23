import type { ReactNode } from "react";

import { BoutiquePageEnter } from "@/components/layout/boutique-page-enter";

type AppTemplateProps = {
  children: ReactNode;
};

export default function AppTemplate({ children }: AppTemplateProps) {
  return <BoutiquePageEnter>{children}</BoutiquePageEnter>;
}
