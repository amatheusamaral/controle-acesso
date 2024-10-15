const PDFDocument = require('pdfkit');
const db = require('../database'); // Ajuste o caminho conforme necessário
const moment = require('moment'); // Não precisa mais do moment-timezone

function gerarRelatorio(req, res) {
    // Obter a senha do corpo da requisição
    const { senha } = req.body;

    // Defina a senha correta aqui
    const SENHA_CORRETA = 'Seca3993'; // Substitua pela sua senha real

    // Verificar se a senha está correta
    if (senha !== SENHA_CORRETA) {
        return res.status(403).send('Senha incorreta. Acesso negado.');
    }

    const doc = new PDFDocument();
    const filename = `relatorio-${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    res.setHeader('Content-Type', 'application/pdf');

    doc.pipe(res);

    doc.fontSize(25).text('Relatório de Acessos', { align: 'center' });
    doc.moveDown();

    // Consulta para pegar os dados de acesso
    db.all(`SELECT alunos.nome, alunos.matricula, acessos.entrada, acessos.saida 
            FROM acessos 
            JOIN alunos ON acessos.aluno_id = alunos.id`, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            doc.text('Erro ao gerar relatório.'); // Mensagem de erro no PDF
            doc.end();
            return;
        }

        // Se não houver dados, informe no PDF
        if (rows.length === 0) {
            doc.text('Nenhum registro encontrado.');
        } else {
            // Exibir os dados no PDF
            rows.forEach((row) => {
                // Formatar as datas
                const entradaFormatada = row.entrada ? moment(row.entrada).tz('America/Sao_Paulo').format('DD/MM/YYYY HH:mm:ss') : 'Data inválida';
                const saidaFormatada = row.saida ? moment(row.saida).tz('America/Sao_Paulo').format('DD/MM/YYYY HH:mm:ss') : 'Ainda no laboratório';

                doc.text(`Nome: ${row.nome}, Matrícula: ${row.matricula}, Entrada: ${entradaFormatada}, Saída: ${saidaFormatada}`);
            });
        }

        doc.end();
    });
}

module.exports = gerarRelatorio;
