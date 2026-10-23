/** Lone UTF-16 surrogates (e.g. half an emoji cut by a paste limit) make encodeURIComponent throw. */
const wellFormed = (s: string) => s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "�");

export const mailtoHref = (to: string, subject: string, body: string) =>
  `mailto:${to}?subject=${encodeURIComponent(wellFormed(subject))}&body=${encodeURIComponent(wellFormed(body))}`;
