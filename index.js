const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// --- Configuração do WhatsApp gratuito ---
const client = new Client({
	authStrategy: new LocalAuth({
		dataPath: './sessions',
	}),
	puppeteer: {
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
	},
});

client.on('qr', (qr) => {
	console.log('\n--- DIGITALIZE O QR CODE ABAIXO NO SEU WHATSAPP ---');
	qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
	console.log(
		'\n✓ WhatsApp Bot está pronto e conectado! Agora o envio automático está ativo.',
	);
});

client.on('auth_failure', (msg) => {
	console.error('Falha na autenticação do WhatsApp:', msg);
});

client.initialize();
// ----------------------------------------

// Configurações do Multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Configuração do Transportador de E-mail
const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS,
	},
});

app.post('/api/send-contract', upload.single('pdf'), async (req, res) => {
	try {
		const { clientName, email } = req.body;
		const pdfFile = req.file;

		if (!pdfFile) {
			return res.status(400).send('Arquivo PDF não enviado');
		}

		console.log(`\n➡ Recebido contrato de: ${clientName}`);

		// 1. Enviar via E-mail
		const mailOptions = {
			from: process.env.EMAIL_USER,
			to: process.env.EMAIL_RECEIVER,
			subject: `Novo Contrato Gerado - ${clientName}`,
			text: `Olá,\n\nUm novo contrato foi gerado no site por ${clientName}.\nVerifique o arquivo em anexo.`,
			attachments: [
				{
					filename: `Contrato_${clientName.replace(/\s+/g, '_')}.pdf`,
					content: pdfFile.buffer,
				},
			],
		};

		const emailInfo = await transporter
			.sendMail(mailOptions)
			.catch((err) => {
				console.error('Erro e-mail:', err.message);
				return null;
			});
		if (emailInfo) console.log('✓ E-mail enviado com sucesso.');

		// 2. Enviar via WhatsApp (Real e Gratuito)
		const targetNumber = process.env.WHATSAPP_NUMBER.replace(/\D/g, '');
		const whatsappId = `${targetNumber}@c.us`;

		try {
			const media = new MessageMedia(
				'application/pdf',
				pdfFile.buffer.toString('base64'),
				`Contrato_${clientName.replace(/\s+/g, '_')}.pdf`,
			);

			await client.sendMessage(whatsappId, media, {
				caption: `📄 *Novo Contrato Gerado!* \n\nCliente: ${clientName}\nE-mail: ${email}\n\nO PDF completo está em anexo.`,
			});
			console.log(`✓ WhatsApp enviado para ${targetNumber}`);
		} catch (wsError) {
			console.error('Erro WhatsApp:', wsError.message);
		}

		res.status(200).json({
			message: 'Iniciado processamento de envio para e-mail e WhatsApp.',
		});
	} catch (error) {
		console.error('Erro geral ao processar contrato:', error);
		res.status(500).send('Erro interno: ' + error.message);
	}
});

app.listen(port, () => {
	console.log(`Servidor rodando em http://localhost:${port}`);
});
