import { DatabaseQuerier, CategoryRow } from "../Database";

export { Category }

class Category {
  id: number;
  name: string;
  color?: string;

  constructor(data: CategoryRow) {
    this.id = data.id;
    this.name = data.name;
    if (data.color) {
      this.color = data.color;
    }
  }

  static async create(categoryName: string, color?: string): Promise<Category> {
    const querier = new DatabaseQuerier();
    const data = await querier.addCategory(categoryName, color);
    return new Category(data);
  }

  static async getAll(): Promise<Category[]> {
    const querier = new DatabaseQuerier();
    const data = await querier.getCategories();
    return data.map(dataRow => new Category(dataRow));
  }
}