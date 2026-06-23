import type { ReactNode } from "react";

type AppTemplateProps = {
  children: ReactNode;
};

export default function AppTemplate({ children }: AppTemplateProps) {
  return <div className="boutique-page-enter">{children}</div>;
}
