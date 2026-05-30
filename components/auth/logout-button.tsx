import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

type LogoutButtonProps = {
  action: (formData: FormData) => Promise<void> | void;
  redirectTo: string;
};

export function LogoutButton({ action, redirectTo }: LogoutButtonProps) {
  const t = useTranslations("Auth");

  return (
    <form action={action}>
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <Button type="submit" variant="outline">
        <LogOut />
        {t("logout")}
      </Button>
    </form>
  );
}
