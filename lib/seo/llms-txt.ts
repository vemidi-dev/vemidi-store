import { siteConfig } from "@/config/site";
import { getSiteUrl } from "@/lib/site-url";

function absoluteUrl(path: string, siteUrl: URL) {
  return new URL(path, siteUrl).toString();
}

function linkLine(label: string, path: string, siteUrl: URL) {
  return `- [${label}](${absoluteUrl(path, siteUrl)})`;
}

export function buildLlmsTxt(siteUrl: URL = getSiteUrl()): string {
  const { business, topBar } = siteConfig;
  const social = topBar.social;

  const mainPages = [
    linkLine("Начало", "/", siteUrl),
    linkLine("Продукти", "/produkti", siteUrl),
    linkLine("Категории", "/categorii", siteUrl),
    linkLine("По повод", "/povodi", siteUrl),
    linkLine("Заготовки и материали", "/zagotovki-i-materiali", siteUrl),
    linkLine("Блог", "/blog", siteUrl),
    linkLine("Контакти", "/kontakti", siteUrl),
  ].join("\n");

  const policies = [
    linkLine("Доставка и плащане", "/delivery", siteUrl),
    linkLine("Връщане и рекламации", "/returns", siteUrl),
    linkLine("Отказ от договор", "/withdrawal", siteUrl),
    linkLine("Общи условия", "/terms", siteUrl),
    linkLine("Поверителност", "/privacy", siteUrl),
    linkLine("Бисквитки", "/cookies", siteUrl),
  ].join("\n");

  const machineReadable = [
    linkLine("Sitemap", "/sitemap.xml", siteUrl),
    linkLine("Robots", "/robots.txt", siteUrl),
  ].join("\n");

  const contactLines = [
    `- Юридическо име: ${business.legalName}`,
    `- Адрес: ${business.address}`,
    `- Имейл: ${business.email}`,
    `- Телефон: ${business.phoneDisplay}`,
  ];

  if (social.instagram?.trim()) {
    contactLines.push(`- Instagram: ${social.instagram.trim()}`);
  }
  if (social.facebook?.trim()) {
    contactLines.push(`- Facebook: ${social.facebook.trim()}`);
  }
  if (social.tiktok?.trim()) {
    contactLines.push(`- TikTok: ${social.tiktok.trim()}`);
  }

  return [
    `# ${siteConfig.name}`,
    "",
    `> ${siteConfig.description}`,
    "",
    "Актуалните цени, наличности и варианти са публикувани на съответните продуктови страници в сайта.",
    "",
    "## Основни страници",
    "",
    mainPages,
    "",
    "## Продуктови области",
    "",
    "- Персонализирани дървени картички и пликове за пари.",
    "- Подаръци за кръщене, рожден ден, сватба, учители и детска градина.",
    "- Заготовки и материали за творчество.",
    "- Малки серии ръчно изработени изделия и декорации.",
    "",
    "## Политики и обслужване",
    "",
    policies,
    "",
    "## Машинно четими ресурси",
    "",
    machineReadable,
    "",
    "## Контакт",
    "",
    contactLines.join("\n"),
    "",
  ].join("\n");
}
