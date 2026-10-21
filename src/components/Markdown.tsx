import ReactMarkdown from "react-markdown";

// Affiche le texte d'une critique (Markdown → mise en page magazine, voir .critique dans globals.css).
export function Markdown({ children, dropCap = false }: { children: string; dropCap?: boolean }) {
  return (
    <div className={`critique ${dropCap ? "critique--dropcap" : ""}`}>
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}
