import Image from "next/image";

import { MediaPlaceholder } from "@/components/ui/media-placeholder";

export function ContentImage({
  src,
  alt,
  label,
  dark = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
  fit = "cover",
}: {
  src: string | null;
  alt: string;
  label: string;
  dark?: boolean;
  sizes?: string;
  fit?: "cover" | "contain";
}) {
  return src ? (
    <div className="relative h-full w-full">
      <Image src={src} alt={alt} fill sizes={sizes} className={fit === "contain" ? "object-contain" : "object-cover"} />
    </div>
  ) : (
    <MediaPlaceholder label={label} dark={dark} />
  );
}
