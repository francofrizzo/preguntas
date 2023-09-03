# Preguntas

This repo contains a Node.js + Vue application that I developed while studying
for final exams. It allows you to load a database of questions (organized by
categories). Then, you can select a subset of categories and get asked a random
question. If you know the answer, you can write it down and mark the question as
known; if you don't, you can mark it as unknown and it will be asked again
later. You can also reset the status of all questions, so they will be asked
again.

## How to use
Run `npm install` to install the dependencies, and then run `npm run start` to
start the server, which will be listening on port 3000.

You can make a production build by running `npm run build`. The resulting
`dist/` directory can be served by running `node App.js`.

The first time you run the app, it will create an empty SQLite database located
in `local/questions.sqlite3`. You can load questions into the database with
any SQLite client (I used [DB Browser for SQLite](https://sqlitebrowser.org/)).
The database schema is simple enough -- it contains two tables, `categories` and
`questions`.
