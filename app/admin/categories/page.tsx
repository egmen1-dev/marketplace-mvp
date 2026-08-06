import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminCategoriesPanel, listAdminCategories } from "@/features/admin";

export const metadata = {
  title: "Категории",
};

export default async function AdminCategoriesPage() {
  const categories = await listAdminCategories();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Категории
        </h2>
        <p className="text-sm text-muted-foreground">
          CRUD и скрытие · дерево через parentId
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Дерево</CardTitle>
          <CardDescription>
            Создание, редактирование и скрытие категорий
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminCategoriesPanel categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
