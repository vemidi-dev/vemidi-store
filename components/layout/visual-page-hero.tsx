import Image from "next/image";
import type { ReactNode } from "react";

import styles from "./visual-page-hero.module.css";

type VisualPageHeroProps = {
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  eyebrow?: ReactNode;
  imagePosition?: string;
  descriptionAs?: "p" | "h2";
};

export function VisualPageHero({
  title,
  description,
  imageSrc,
  imageAlt,
  eyebrow,
  imagePosition = "center",
  descriptionAs = "p",
}: VisualPageHeroProps) {
  const Description = descriptionAs;
  return (
    <section className={styles.hero} data-visual-page-hero>
      <div className={styles.scene}>
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          priority
          sizes="(max-width: 767px) 100vw, (max-width: 1920px) 75vw, 1440px"
          className={styles.photo}
          style={{ objectPosition: imagePosition }}
        />
      </div>
      <div className={styles.inner}>
        <div className={styles.copy}>
          {eyebrow ? <div className={styles.eyebrow}>{eyebrow}</div> : null}
          <h1 className={styles.title}>{title}</h1>
          <Description className={styles.description}>{description}</Description>
        </div>
      </div>
    </section>
  );
}
