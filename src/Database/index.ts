import * as sqlite from "sqlite"
export { DatabaseQuerier, updateDatabaseSchema, CategoryRow, QuestionRow }

type CategoryRow = {
  id: number,
  name: string,
  color: string|null,
};

type QuestionRow = {
  id: number,
  text: string,
  timesAsked: number,
  timesCorrect: number,
  skip: boolean,
  answer: string,
  category: CategoryRow,
}

const dbPromise: Promise<sqlite.Database> = sqlite
  .open("local/questions.sqlite3")
  .then(db => updateDatabaseSchema(db));

const updateDatabaseSchema = async function(db: sqlite.Database) {
  await db.run(`CREATE TABLE IF NOT EXISTS category (
    id       INTEGER  PRIMARY KEY  AUTOINCREMENT,
    name     TEXT     NOT NULL     UNIQUE,
    color    TEXT
  )`);
  await db.run(`CREATE TABLE IF NOT EXISTS question (
    id           INTEGER  PRIMARY KEY  AUTOINCREMENT,
    text         TEXT     NOT NULL,
    timesAsked   INTEGER  NOT NULL   DEFAULT 0   CHECK(timesAsked >= 0),
    timesCorrect INTEGER  NOT NULL   DEFAULT 0   CHECK(timesCorrect >= 0),
    skip         INTEGER  NOT NULL   DEFAULT 0   CHECK(skip IN (0, 1)),
    answer       TEXT,
    categoryId   INTEGER  NOT NULL,
    FOREIGN KEY(categoryId) REFERENCES category(id)
  )`);  
  return db;
};

class DatabaseQuerier {
  async getCategory(categoryName: string): Promise<CategoryRow|null> {
    const db: sqlite.Database = await dbPromise;
    const row = await db.get(`
      SELECT id, name, color FROM category
        WHERE name = $name;
    `, { $name: categoryName });
    if (row) {
      return {
        id: row.id,
        name: row.name,
        color: row.color,
      };
    } else {
      return null;
    }
  }

  async getCategories(): Promise<CategoryRow[]> {
    const db: sqlite.Database = await dbPromise;
    const rows = await db.all(`
      SELECT id, name, color FROM category;
    `);
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      color: row.color,
    }));
  }

  async addCategory(categoryName: string, color?: string): Promise<CategoryRow> {
    const db: sqlite.Database = await dbPromise;
    if (color) {
        await db.run(`
        INSERT OR IGNORE INTO category(name, color)
          VALUES ($categoryName, $color)
      `, { $categoryName: categoryName, $color: color });
    } else {
        await db.run(`
        INSERT OR IGNORE INTO category(name)
          VALUES ($categoryName)
      `, { $categoryName: categoryName });
    }
    return this.getCategory(categoryName) as Promise<CategoryRow>;
  }

  async getOrAddCategory(categoryName: string) {
    let category = await this.getCategory(categoryName);
    if (!category) {
      category = await this.addCategory(categoryName);
    }
    return category;
  }
  
  async getQuestions(categoryNames?: string[]): Promise<QuestionRow[]> {
    const db: sqlite.Database = await dbPromise;
    let rows;
    if (categoryNames) {
      rows = await db.all(`
        SELECT q.*, c.name, c.color
          FROM question AS q JOIN category AS c ON q.categoryId = c.id
          WHERE c.name IN (${categoryNames.map(n => '?').join(',')});
      `, categoryNames);
    } else {
      rows = await db.all(`
        SELECT q.*, c.name, c.color
          FROM question AS q JOIN category AS c ON q.categoryId = c.id;
      `);
    }
    return rows.map(row => ({
      id: row.id,
      text: row.text,
      timesAsked: row.timesAsked,
      timesCorrect: row.timesCorrect,
      skip: row.skip === 1,
      answer: row.answer,
      category: {
        id: row.categoryId,
        name: row.name,
        color: row.color,
      },
    }));
  };
  
  async getQuestion(id?: number): Promise<QuestionRow|null> {
    const db: sqlite.Database = await dbPromise;
    const row = await db.get(`
      SELECT q.*, c.name, c.color
        FROM question AS q JOIN category AS c ON q.categoryId = c.id
        WHERE q.id = $id;
    `, { $id: id });
    if (row) {
      return {
        id: row.id,
        text: row.text,
        timesAsked: row.timesAsked,
        timesCorrect: row.timesCorrect,
        skip: row.skip === 1,
        answer: row.answer,
        category: {
          id: row.categoryId,
          name: row.name,
          color: row.color,
        },
      };
    } else {
      return null;
    }
  };

  async getRandomQuestion(
    categoryNames?: string[],
    filter?: (row: QuestionRow) => boolean,
  ): Promise<QuestionRow|null> {
    const questions = (await this.getQuestions(categoryNames)).filter(filter || (x => x));
    if (questions.length > 0) {
      return questions[Math.floor(Math.random() * questions.length)];
    } else {
      return null;
    }
  };

  async addQuestion(question: string, categoryName: string): Promise<QuestionRow> {
    const db: sqlite.Database = await dbPromise;
    const category = await this.getOrAddCategory(categoryName);
    const result = await db.run(`
      INSERT INTO question(text, categoryId)
        VALUES ($text, $categoryId)
    `, { $text: question, $categoryId: category.id })
    return this.getQuestion(result.lastID) as Promise<QuestionRow>;
  };

  async countQuestions(categoryNames?: string[]): Promise<number> {
    const db: sqlite.Database = await dbPromise;
    let row;
    if (categoryNames) {
      row = await db.get(`
        SELECT COUNT(q.id) as count
          FROM question AS q JOIN category AS c ON q.categoryId = c.id
          WHERE c.name IN (${categoryNames.map(n => '?').join(',')});
      `, categoryNames);
    } else {
      row = await db.get(`
        SELECT COUNT(q.id) as count
          FROM question AS q JOIN category AS c ON q.categoryId = c.id;
      `);
    }
    return row.count;
  };

  async countSkippedQuestions(categoryNames?: string[]): Promise<number> {
    const db: sqlite.Database = await dbPromise;
    let row;
    if (categoryNames) {
      row = await db.get(`
        SELECT COUNT(q.id) as count
          FROM question AS q JOIN category AS c ON q.categoryId = c.id
          WHERE skip = 1
            AND c.name IN (${categoryNames.map(n => '?').join(',')});
      `, categoryNames);
    } else {
      row = await db.get(`
        SELECT COUNT(q.id) as count
          FROM question AS q JOIN category AS c ON q.categoryId = c.id
          WHERE skip = 1;
      `);
    }
    return row.count;
  };

  async updateQuestion(
    id: number|null,
    values: {
      timesAsked?: number,
      timesCorrect?: number
      skip?: boolean,
      answer?: string,
    },
  ): Promise<number> {
    const db: sqlite.Database = await dbPromise;
    const fieldNames = ['timesAsked', 'timesCorrect', 'skip', 'answer'].filter(key => values.hasOwnProperty(key));
    const fieldValues = {
      $id: id ? id : undefined,
      $timesAsked: values.timesAsked,
      $timesCorrect: values.timesCorrect,
      $skip: values.skip === true ? 1 : (values.skip === false ? 0 : undefined),
      $answer: values.answer,
    };
    if (fieldNames.length > 0) {
      const query = `
      UPDATE question
        SET ${fieldNames.map(key => `${key} = $${key}`).join(', ')}
        ${id ? 'WHERE id = $id' : ''};
      `;
      const result = await db.run(query, fieldValues);
      return result.changes;
    } else {
      return 0;
    }
  }
}

