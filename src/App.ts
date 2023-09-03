import * as express from "express";
import * as bodyParser from "body-parser";
import { Question } from "./Models/Question";
import { loadQuestions } from "./Questions";
import { join as pathJoin } from "path";
import { Category } from "./Models/Category";
export { server }

const basepath = process.env.BASEPATH || "http://localhost:3000";

const server = {
  start: async function(): Promise<void> {
    const app = express();
    const port = 3000;

    app.set('views', pathJoin(__dirname, '../web/views'));
    app.set('view engine', 'ejs');
    app.use(bodyParser.json());

    app.use('/', express.static(pathJoin(__dirname, '../web/static')));

    app.get('/', async (req, res) => {
      res.render('main', { basepath });
    });
    
    app.get('/category', async(req, res) => {
      const categories = await Category.getAll();
      res.status(200).json(categories);
    })

    app.get('/question/random', async (req, res) => {
      const categories = req.query.categories as string[]
      const question = await Question.getRandom(categories);
      if (question) {
        question.incrementAsked();
        res.status(200).json({
          ...question
        });
      } else {
        res.status(404).send('There are no questions available');
      }
    });

    app.post('/question/reset', async (req, res) => {
      await Question.resetAll();
      res.sendStatus(200);
    });

    app.get('/question/:id', async (req, res) => {
      const { id } = req.params;
      const question = await Question.get(parseInt(id, 10));
      if (question) {
        res.status(200).json(question);
      } else {
        res.status(404).send('There are no questions available');
      }
    });

    app.patch('/question/:id', async (req, res) => {
      const { id } = req.params;
      const { 
        correct,
        answer
      } = req.body;
      const question = await Question.get(parseInt(id, 10));
      if (question) {
        if (correct) {
          await Promise.all([
            question.incrementCorrect(),
            question.startSkipping(),
          ]);
        }
        if (answer) {
          await question.changeAnswer(answer);
        }
        res.sendStatus(200);
      } else {
        res.status(404).send('There is no question with the provided ID');
      }
    });

      
    app.get('/stats', async(req, res) => {
      const categories = req.query.categories as string[];
      const totalQuestions = await Question.getTotalCount(categories);
      const skippedQuestions = await Question.getSkippedCount(categories);
      res.status(200).json({
        totalQuestions,
        skippedQuestions,
      });
    })
    
    app.listen(port, () => console.log(`Listening on port ${port}`));
  },
}

// loadQuestions().then(() => {
  server.start()
// });
