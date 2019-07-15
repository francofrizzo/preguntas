import { DatabaseQuerier, QuestionRow } from "../Database";
import { Category } from "./Category";
export { Question };

class Question {
  id: number;
  text: string;
  timesAsked: number;
  timesCorrect: number;
  skip: boolean;
  answer: string;
  category: Category;

  constructor(data: QuestionRow) {
    this.id = data.id;
    this.text = data.text;
    this.timesAsked = data.timesAsked;
    this.timesCorrect = data.timesCorrect;
    this.skip = data.skip;
    this.answer = data.answer;
    this.category = new Category(data.category);
  }

  static async create(question: string, categoryName: string): Promise<Question> {
    const querier = new DatabaseQuerier();
    const data = await querier.addQuestion(question, categoryName);
    return new Question(data);
  }

  static async getAll(categoryNames?: string[]): Promise<Question[]> {
    const querier = new DatabaseQuerier();
    const data = await querier.getQuestions(categoryNames);
    return data.map(dataRow => new Question(dataRow));
  }

  static async get(id: number): Promise<Question|null> {
    const querier = new DatabaseQuerier();
    const data = await querier.getQuestion(id);
    return data ? new Question(data) : null;
  }

  private static async getRandomWithFilter(
    categoryNames?: string[],
    filter?: (row: QuestionRow) => boolean,
  ) {
    const querier = new DatabaseQuerier();
    const data = await querier.getRandomQuestion(categoryNames, filter);
    return data ? new Question(data) : null;
  }

  static async getRandom(categoryNames?: string[]): Promise<Question|null> {
    return Question.getRandomWithFilter(categoryNames, c => !c.skip);
  }

  static async getRandomNeverAsked(categoryNames?: string[]): Promise<Question|null> {
    return Question.getRandomWithFilter(categoryNames, c => !c.skip && c.timesAsked == 0)
  }

  static async getRandomNeverCorrect(categoryNames?: string[]): Promise<Question|null> {
    return Question.getRandomWithFilter(categoryNames, c => !c.skip && c.timesCorrect == 0)
  }

  static async resetAll(): Promise<void> {
    const querier = new DatabaseQuerier();
    await querier.updateQuestion(null, { skip: false });
  }

  static async getTotalCount(categoryNames?: string[]): Promise<number> {
    const querier = new DatabaseQuerier();
    return querier.countQuestions(categoryNames);
  }

  static async getSkippedCount(categoryNames?: string[]): Promise<number> {
    const querier = new DatabaseQuerier();
    return querier.countSkippedQuestions(categoryNames);
  }

  async startSkipping() {
    const querier = new DatabaseQuerier();
    const result = await querier.updateQuestion(this.id, { skip: true });
    if (result > 0) {
      this.skip = true;
    }
  }

  async incrementAsked() {
    const querier = new DatabaseQuerier();
    const result = await querier.updateQuestion(this.id, { timesAsked: this.timesAsked + 1 });
    if (result > 0) {
      this.timesAsked += 1;
    }
  }

  async incrementCorrect() {
    const querier = new DatabaseQuerier();
    const result = await querier.updateQuestion(this.id, { timesCorrect: this.timesCorrect + 1});
    if (result > 0) {
      this.timesCorrect += 1;
    }
  }

  async changeAnswer(answer: string) {
    const querier = new DatabaseQuerier();
    const result = await querier.updateQuestion(this.id, { answer });
    if (result > 0) {
      this.answer += answer;
    }
  }
}
