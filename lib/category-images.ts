type CategoryType = "product" | "occasion" | "material";

/**
 * Slug aliases when admin slug differs from the image file basename.
 */
const SLUG_ALIASES: Record<string, string> = {
  bebe: "bebe",
  rd: "rozhden-den",
  jubilej: "yubiley",
  "za-uchitel": "za-uchiteli",
  "plikove-za-pari": "plik-za-pari",
  "kutii-i-kutiyki": "kutii",
  "kutii-i-koshnichki": "kutii",
  "kutiyki-i-koshnichki": "kutii",
  "kutiiki-i-koshnichki": "kutii",
  "ramki-i-pana": "ramki-i-pana",
  "ramki-pana": "ramki-i-pana",
  "podaracheta-za-gosti": "gosti",
  "gipsovi-figurki": "gipsovi-figurki",
  "gipsovi-figurki-za-otsvetyavane": "gipsovi-figurki",
  "gipsovi-figurki-za-ocvetiavane": "gipsovi-figurki",
  "skandinavski-muh": "moss",
  "sakndinavski-muh": "moss",
  "sakndinavski muh": "moss",
  moss: "moss",
  family: "semejni",
  "semejni-podaraci": "semejni",
  "semejni-podaracheta": "semejni",
  zakachalki: "zakachalki-kluch",
  "zakachalki-i-klyuchodarzhateli": "zakachalki-kluch",
  "zakachalki-i-kliuchodarzhateli": "zakachalki-kluch",
  home: "new-home",
  "za-nov-dom": "new-home",
  "nov-dom": "new-home",
};

const PRODUCT_IMAGE_FILES: Record<string, string> = {
  bijuta: "bijuta.jpg",
  "bijuta-i-aksesoari": "bijuta.jpg",
  gips: "gips.png",
  "gipsovi-figurki": "gipsovi-figurki-za-ocvetiavane.webp",
  moss: "../moss.webp",
  semejni: "../semejni.jpg",
  gosti: "gosti.jpg",
  kutii: "kutii-i-koshnichki.webp",
  medali: "medali.webp",
  "plik-za-pari": "plik-za-pari.webp",
  "ramki-i-pana": "ramki-i-pana.png",
  "sapuneni-rozi": "sapuneni-rozi.webp",
  "zakachalki-kluch": "zakachalki-i-kljuchodarjateli.webp",
  "tvorcheski-komplekti": "../tvorcheski-komplekti.webp",
};

const OCCASION_IMAGE_FILES: Record<string, string> = {
  "8-mart": "../8-mart.png",
  koleda: "../koleda.png",
  velikden: "../velikden.png",
  "za-deca": "../za-deca.png",
  "new-home": "../ocassion-new-home.png",
  krashtene: "../occasion-krashtene.webp",
  bebe: "../occasion-bebe.png",
  svatba: "../occasion-svatba.webp",
  "rozhden-den": "../occasion-rozhden-den.webp",
  yubiley: "../occasion-yubiley.webp",
  abiturient: "../occasion-abiturientski-bal.webp",
  "abiturientski-bal": "../occasion-abiturientski-bal.webp",
  "za-uchiteli": "../occasion-za-uchiteli.webp",
  "za-uchitel": "../occasion-za-uchiteli.webp",
};

function resolveImageSlug(slug: string): string {
  return SLUG_ALIASES[slug] ?? slug;
}

function buildProductImagePath(fileName: string): string {
  if (fileName.startsWith("../")) {
    return `/assets/${fileName.slice(3)}`;
  }

  return `/assets/categories/product/${fileName}`;
}

function buildOccasionImagePath(fileName: string): string {
  if (fileName.startsWith("../")) {
    return `/assets/${fileName.slice(3)}`;
  }

  return `/assets/categories/occasion/${fileName}`;
}

/**
 * Returns a public path for a category image.
 * Product images live in `public/assets/categories/product/`.
 */
export function getCategoryImageSrc(
  slug: string,
  categoryType: CategoryType,
): string {
  const imageSlug = resolveImageSlug(slug);

  if (categoryType === "product") {
    const fileName = PRODUCT_IMAGE_FILES[imageSlug] ?? PRODUCT_IMAGE_FILES[slug];
    if (fileName) {
      return buildProductImagePath(fileName);
    }

    return `/assets/categories/product/${imageSlug}.webp`;
  }

  if (categoryType === "material") {
    return "/assets/products.png";
  }

  const fileName = OCCASION_IMAGE_FILES[imageSlug] ?? OCCASION_IMAGE_FILES[slug];
  if (fileName) {
    return buildOccasionImagePath(fileName);
  }

  return `/assets/categories/occasion/${imageSlug}.webp`;
}
