import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { SignupForm } from "@/components/AuthForms";
import { currentUser, userCount } from "@/lib/auth";

export const metadata: Metadata = { title: "Créer un compte" };
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  if (await currentUser()) redirect("/");
  const first = (await userCount()) === 0;
  return (
    <AuthShell
      title={first ? "Bienvenue !" : "Créer un compte"}
      subtitle={first ? "Crée le compte administrateur de Dreams." : "Dreams est sur invitation : il te faut le code qu'un membre t'a donné."}
    >
      <SignupForm first={first} />
    </AuthShell>
  );
}
