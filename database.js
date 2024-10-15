// database.js
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./acessos.db', (err) => {
    if (err) {
        console.error(err.message);
    } else {
        db.run(`CREATE TABLE IF NOT EXISTS alunos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            matricula TEXT UNIQUE NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS acessos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            aluno_id INTEGER,
            entrada DATETIME,
            saida DATETIME,
            FOREIGN KEY (aluno_id) REFERENCES alunos (id)
        )`);
    }
});

module.exports = db;
