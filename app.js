const express = require('express');
const bodyParser = require('body-parser');
const db = require('./database');
const PDFDocument = require('pdfkit');
const path = require('path');
const moment = require('moment-timezone');

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Rota para limpar os registros de acessos
app.get('/limpar-relatorio', (req, res) => {
    db.run(`DELETE FROM acessos`, [], function(err) {
        if (err) {
            return res.status(500).send('Erro ao limpar o relatório');
        }
        res.send('Relatório limpo com sucesso!');
    });
});

// Função para formatar a data com o fuso horário de São Paulo
function formatDate(date) {
    return moment.tz(date, 'America/Sao_Paulo').format('YYYY-MM-DD HH:mm:ss');
}

// Rota para adicionar aluno
app.post('/adicionar-aluno', (req, res) => {
    const { nome, matricula } = req.body;
    if (!nome || !matricula) {
        return res.status(400).send('Nome e matrícula são obrigatórios');
    }

    // Verificando se a matrícula já existe
    db.get(`SELECT * FROM alunos WHERE matricula = ?`, [matricula], (err, aluno) => {
        if (err) {
            return res.status(500).send(err.message);
        }
        if (aluno) {
            return res.redirect('/?errorMessage=Aluno já cadastrado com esta matrícula.'); // Mensagem de erro específica
        }

        // Inserindo novo aluno
        db.run(`INSERT INTO alunos (nome, matricula) VALUES (?, ?)`, [nome, matricula], function(err) {
            if (err) {
                return res.status(500).send(err.message);
            }
            res.redirect('/');
        });
    });
});

// Rota para registrar entrada
app.post('/registrar-entrada', (req, res) => {
    const { matricula } = req.body;
    if (!matricula) {
        return res.status(400).send('Matrícula é obrigatória');
    }
    db.get(`SELECT id FROM alunos WHERE matricula = ?`, [matricula], (err, aluno) => {
        if (err || !aluno) {
            return res.redirect('/?errorMessage=Aluno não encontrado'); // Mensagem de erro específica
        }
        db.run(`INSERT INTO acessos (aluno_id, entrada) VALUES (?, ?)`, [aluno.id, formatDate(new Date())], function(err) {
            if (err) {
                return res.status(500).send(err.message);
            }
            res.redirect('/');
        });
    });
});

// Rota para registrar saída
app.post('/registrar-saida', (req, res) => {
    const { matricula } = req.body;
    if (!matricula) {
        return res.status(400).send('Matrícula é obrigatória');
    }
    db.get(`SELECT id FROM alunos WHERE matricula = ?`, [matricula], (err, aluno) => {
        if (err || !aluno) {
            return res.redirect('/?errorMessage=Aluno não encontrado'); // Mensagem de erro específica
        }
        db.run(`UPDATE acessos SET saida = ? WHERE aluno_id = ? AND saida IS NULL`, [formatDate(new Date()), aluno.id], function(err) {
            if (err) {
                return res.status(500).send(err.message);
            }
            res.redirect('/');
        });
    });
});



// Rota para gerar relatório com senha
app.post('/gerar-relatorio', (req, res) => {
    const senhaCorreta = 'Seca3993'; // Defina sua senha aqui
    const { senha } = req.body;

    if (senha !== senhaCorreta) {
        return res.redirect('/?errorMessage=Senha incorreta'); // Redireciona com mensagem de erro
    }

    const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 30, right: 30 }
    });
    let filename = `relatorio-${Date.now()}.pdf`;
    res.setHeader('Content-disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    // Título do relatório
    doc.fontSize(20).text('Relatório de Acessos', { align: 'center' });
    doc.moveDown();

    // Cabeçalhos das colunas
    doc.fontSize(10);
    const columnWidth = 120; // Aumenta a largura da coluna "Nome"
    const columnSpacing = 10; // Espaço entre as colunas

    // Adicionando os cabeçalhos
    const startY = doc.y; // Posição inicial para a tabela
    doc.text('Nome', 30, startY, { width: columnWidth, align: 'left' });
    doc.text('Matrícula', 30 + columnWidth + columnSpacing, startY, { width: columnWidth, align: 'left' });
    doc.text('Entrada', 30 + columnWidth * 2 + columnSpacing * 2, startY, { width: columnWidth, align: 'left' });
    doc.text('Saída', 30 + columnWidth * 3 + columnSpacing * 3, startY, { width: columnWidth, align: 'left' });
    doc.moveDown(0.5); // Espaçamento entre cabeçalho e dados

    // Linha separadora dos cabeçalhos
    doc.moveTo(30, doc.y).lineTo(30 + columnWidth * 4 + columnSpacing * 3, doc.y).stroke();
    doc.moveDown(0.5); // Espaçamento entre cabeçalho e dados

    // Consulta para pegar os dados de acesso
    db.all(`SELECT a.nome, a.matricula, ac.entrada, ac.saida FROM alunos a JOIN acessos ac ON a.id = ac.aluno_id`, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erro ao gerar o relatório');
        }

        // Exibir os dados no PDF
        rows.forEach(row => {
            const entradaFormatada = row.entrada ? moment(row.entrada).tz('America/Sao_Paulo').format('DD/MM/YYYY HH:mm:ss') : 'Data inválida';
            const saidaFormatada = row.saida ? moment(row.saida).tz('America/Sao_Paulo').format('DD/MM/YYYY HH:mm:ss') : 'Ainda no laboratório';

            // Posição atual para a linha de dados
            const currentY = doc.y; 

            // Adiciona os dados no formato tabular
            doc.text(row.nome, 30, currentY, { width: columnWidth, align: 'left' });
            doc.text(row.matricula, 30 + columnWidth + columnSpacing, currentY, { width: columnWidth, align: 'left' });
            doc.text(entradaFormatada, 30 + columnWidth * 2 + columnSpacing * 2, currentY, { width: columnWidth, align: 'left' });
            doc.text(saidaFormatada, 30 + columnWidth * 3 + columnSpacing * 3, currentY, { width: columnWidth, align: 'left' });

            // Linha separadora da linha de dados
            doc.moveTo(30, currentY + 10).lineTo(30 + columnWidth * 4 + columnSpacing * 3, currentY + 10).stroke(); // Largura da linha ajustada para 10px abaixo do texto

            doc.moveDown(0.1); // Espaçamento menor entre as linhas
        });

        // Finaliza o documento
        doc.end();
    });
});

// Rota principal
app.get('/', (req, res) => {
    const errorMessage = req.query.errorMessage; // Captura a mensagem de erro da query
    res.sendFile(path.join(__dirname, 'public', 'index.html'), { 
        headers: {
            'Content-Type': 'text/html'
        }
    }); // Passa a mensagem como opção
});

// Inicializando o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
