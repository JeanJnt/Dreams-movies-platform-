// Chaque page arrive par un court fondu : on sent le changement de plan, sans attendre.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
