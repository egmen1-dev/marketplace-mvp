import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminUsersTable, listAdminUsers } from "@/features/admin";

export const metadata = {
  title: "Пользователи",
};

export default async function AdminUsersPage() {
  const users = await listAdminUsers();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Пользователи
        </h2>
        <p className="text-sm text-muted-foreground">
          Всего: {users.length}. Роли и блокировка.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список</CardTitle>
          <CardDescription>Изменение роли требует подтверждения</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminUsersTable users={users} />
        </CardContent>
      </Card>
    </div>
  );
}
