import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "@/components/AuthForms";
import { currentUser, userCount } from "@/lib/auth";

export const metadata: Metadata = { title: "Connexion" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ supprime?: string }> }) {
  if (await currentUser()) redirect("/");
  if ((await userCount()) === 0) redirect("/inscription"); // tout premier lancement
  const { supprime } = await searchParams;
  return (
    <AuthShell title="Connexion" subtitle="Le journal de cinéma de la bande.">
      <LoginForm deleted={Boolean(supprime)} />
    </AuthShell>
  );
}
