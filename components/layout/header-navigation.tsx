"use client";

import Link from "next/link";

import { NavDropdown } from "@/components/layout/nav-dropdown";
import { siteConfig } from "@/config/site";
import {
  HEADER_CATEGORY_DROPDOWN,
  HEADER_MATERIAL_DROPDOWN,
  HEADER_OCCASION_DROPDOWN,
  type HeaderNavDropdownItem,
} from "@/lib/category-navigation";
import {
  CATEGORY_INDEX_PATH,
  MATERIAL_INDEX_PATH,
  OCCASION_INDEX_PATH,
} from "@/lib/category-url";

const navLinkClass =
  "relative whitespace-nowrap rounded-sm text-sm font-medium text-boutique-muted transition-colors duration-200 after:pointer-events-none after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-boutique-rose-deep after:transition-transform after:duration-300 hover:text-boutique-rose-deep hover:after:scale-x-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-boutique-sage focus-visible:ring-offset-2";

type HeaderNavigationProps = {
  productCategoryItems: HeaderNavDropdownItem[];
  occasionCategoryItems: HeaderNavDropdownItem[];
  materialCategoryItems: HeaderNavDropdownItem[];
  interactionMode: "hover" | "click";
  onNavigate?: () => void;
  className?: string;
};

export function HeaderNavigation({
  productCategoryItems,
  occasionCategoryItems,
  materialCategoryItems,
  interactionMode,
  onNavigate,
  className,
}: HeaderNavigationProps) {
  return (
    <ul className={className ?? "flex items-center gap-4 2xl:gap-5"}>
      {siteConfig.navigation.map((item) => {
        if (item.href === CATEGORY_INDEX_PATH) {
          return (
            <NavDropdown
              key={item.href}
              label={item.label}
              indexHref={HEADER_CATEGORY_DROPDOWN.href}
              indexLabel={HEADER_CATEGORY_DROPDOWN.indexLabel}
              items={productCategoryItems}
              interactionMode={interactionMode}
              onNavigate={onNavigate}
            />
          );
        }

        if (item.href === OCCASION_INDEX_PATH) {
          return (
            <NavDropdown
              key={item.href}
              label={item.label}
              indexHref={HEADER_OCCASION_DROPDOWN.href}
              indexLabel={HEADER_OCCASION_DROPDOWN.indexLabel}
              items={occasionCategoryItems}
              interactionMode={interactionMode}
              onNavigate={onNavigate}
            />
          );
        }

        if (item.href === MATERIAL_INDEX_PATH) {
          return (
            <NavDropdown
              key={item.href}
              label={item.label}
              indexHref={HEADER_MATERIAL_DROPDOWN.href}
              indexLabel={HEADER_MATERIAL_DROPDOWN.indexLabel}
              items={materialCategoryItems}
              interactionMode={interactionMode}
              onNavigate={onNavigate}
            />
          );
        }

        return (
          <li key={item.href}>
            <Link href={item.href} className={navLinkClass} onClick={onNavigate}>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
