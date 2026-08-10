import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminCategoriesPanel, listAdminCategories } from "@/features/admin";
import { AdminTaxonomyTypesPanel } from "@/features/taxonomy/components/admin-taxonomy-types-panel";
import { listAdminTaxonomyTree } from "@/features/taxonomy/queries";

export const metadata = {
  title: "Категории",
};

export default async function AdminCategoriesPage() {
  const [categories, taxonomy] = await Promise.all([
    listAdminCategories(),
    listAdminTaxonomyTree(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Категории и таксономия
        </h2>
        <p className="text-sm text-muted-foreground">
          Дерево категорий · ProductTypes · характеристики · aliases. Sync:{" "}
          <code className="text-xs">npm run taxonomy:sync</code>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Дерево категорий</CardTitle>
          <CardDescription>
            Создание, редактирование и скрытие. Локальные правки не затираются
            sync (locallyEdited).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminCategoriesPanel categories={categories} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ProductTypes</CardTitle>
          <CardDescription>
            Типы товаров, обязательные характеристики и синонимы поиска
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminTaxonomyTypesPanel productTypes={taxonomy.productTypes} />
        </CardContent>
      </Card>
    </div>
  );
}
