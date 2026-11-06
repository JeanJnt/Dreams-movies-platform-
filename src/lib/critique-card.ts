// Le texte en paragraphes, sans la mise en forme Markdown (les tirets de « peut-être » restent).
export function plainParagraphs(markdown: string) {
  return markdown
    .replace(/\r\n/g, "\n")
    .replace(/^\s*```.*$/gm, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split("\n")
        .filter((line) => !/^\s*([-*_])\1{2,}\s*$/.test(line))
        .map((line) => line.replace(/^\s*(?:#{1,6}\s+|>\s?|[-*+]\s+)+/, ""))
        .join(" ")
        .replace(/(\*\*|\*|~~)(?=\S)(.+?)(?<=\S)\1/g, "$2")
        .replace(/(^|[\s(«"])(__?)(?=\S)(.+?)(?<=\S)\2(?=$|[\s.,;:!?)»"])/g, "$1$3")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\\([\\`*_{}[\]()#+\-.!>])/g, "$1")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}
