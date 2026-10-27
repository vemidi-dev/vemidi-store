import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Heart, Shapes, Sparkles } from "lucide-react";

import type { SiteContent } from "@/lib/content/site-content";
import type { ResolvedSiteMedia } from "@/lib/content/site-media-types";
import { CATEGORY_INDEX_PATH, OCCASION_INDEX_PATH } from "@/lib/category-url";
import { PRODUCT_INDEX_PATH } from "@/lib/product-url";
import styles from "./home-hero.module.css";

export function HomeHero({
  content,
  heroImage,
}: {
  content: SiteContent;
  heroImage: ResolvedSiteMedia;
}) {
  return <>
    <section className={styles.hero} aria-label="Подаръци от VeMiDi Crafts" data-home-hero>
      <div className={styles.scene} data-hero-scene>
        <div className={styles.photo} data-hero-photo>
          <Image alt={heroImage.alt} src={heroImage.src} fill priority sizes="100vw" className={styles.image} />
        </div>
      </div>
      <div className={styles.inner}>
        <div className={styles.copy} data-hero-copy>
          <p className={styles.eyebrow}><Heart aria-hidden="true" size={16} />{content["home.hero_eyebrow"]}</p>
          <h1 className={styles.title}>
            {content["home.hero_title_line_1"]}
            <span>{content["home.hero_title_line_2"]}</span>
            <em>{content["home.hero_title_accent"]}</em>
          </h1>
          <p className={styles.description}>{content["home.hero_description"]}</p>
        </div>
        <div className={styles.actions} data-hero-actions>
          <Link href={PRODUCT_INDEX_PATH} className={styles.primary}>Разгледай продуктите<ArrowRight aria-hidden="true" size={18} /></Link>
          <Link href="/sabitiya" className={styles.secondary}><CalendarDays aria-hidden="true" size={18} />Виж работилниците</Link>
        </div>
      </div>
    </section>
    <HomeQuickPaths content={content} />
  </>;
}

export function HomeQuickPaths({ content }: { content: SiteContent }) {
  const paths = [
    { href: OCCASION_INDEX_PATH, icon: Heart, title: content["home.quick_occasions"] },
    { href: CATEGORY_INDEX_PATH, icon: Shapes, title: content["home.quick_categories"] },
    { href: `${PRODUCT_INDEX_PATH}?personalization=only#product-grid`, icon: Sparkles, title: content["home.quick_personalized"] },
    { href: "/sabitiya", icon: CalendarDays, title: content["home.quick_events"] },
  ];
  return <nav aria-label="Открийте в ателието" className="border-b border-boutique-line bg-white">
    <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-5 gap-y-4 px-5 py-5 sm:px-8 lg:grid-cols-4 lg:py-6">
      {paths.map(({ href, icon: Icon, title }) => <Link key={href} href={href} className="flex min-w-0 items-center gap-2.5 text-sm font-medium leading-5 text-boutique-ink transition hover:text-boutique-sage-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-boutique-sage-deep"><Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-boutique-sage-deep" /><span>{title}</span></Link>)}
    </div>
  </nav>;
}
