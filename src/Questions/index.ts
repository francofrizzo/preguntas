export { loadQuestions };
import { readFileSync as read } from "fs";
import { join as pathJoin } from "path";
import { Question } from "../Models/Question";
import { Category } from "../Models/Category";

async function loadQuestions() {
  let categories: any = [];
  let questions: any = []

  try {
    const fileContents = read(pathJoin(__dirname, '../../local/categories.json')).toString();
    categories = JSON.parse(fileContents);
  } catch (err) {
    console.log('File not found: local/categories.json. No categories will be available.');
  }

  try {
    const fileContents = read(pathJoin(__dirname, '../../local/questions.json')).toString();
    questions = JSON.parse(fileContents);
  } catch (err) {
    console.log('File not found: local/questions.json. No questions will be available.');
  }
  for (const category of categories) {
    await Category.create(category.name, category.color);
  }
  // await Promise.all(categories.map((category: any) => {
    // Category.create(category.name, category.color);
  // }));

  await Promise.all(questions.map((question: any) => {
    Question.create(question.question, question.category);
  }));

  console.log(questions, categories);
}
