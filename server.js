const express = require('express');
const multer = require('multer');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const port = Number(process.env.PORT || 8000);

app.use((_request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', '*');
  if (_request.method === 'OPTIONS') {
    return response.sendStatus(204);
  }
  next();
});
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    if (path.extname(file.originalname).toLowerCase() !== '.csv') {
      return callback(new Error('Only CSV files are supported.'));
    }
    callback(null, true);
  },
});

const modelPath = path.join(__dirname, 'track1.py');

function runModel(inputPath) {
  return new Promise((resolve, reject) => {
    const model = spawn(process.env.PYTHON_BIN || 'python3', [modelPath, inputPath]);
    const output = [];
    const errors = [];

    model.stdout.on('data', (chunk) => output.push(chunk));
    model.stderr.on('data', (chunk) => errors.push(chunk));
    model.on('error', reject);
    model.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(Buffer.concat(errors).toString() || `Model exited with code ${code}`));
      }
      resolve(Buffer.concat(output));
    });
  });
}

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.post('/predict', upload.single('file'), async (request, response, next) => {
  if (!request.file) {
    return response.status(400).json({ error: 'Upload a CSV file using the "file" field.' });
  }

  try {
    const result = await runModel(request.file.path);
    response.type('text/csv').send(result);
  } catch (error) {
    next(error);
  } finally {
    await fs.unlink(request.file.path).catch(() => {});
  }
});

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError || error.message === 'Only CSV files are supported.') {
    return response.status(400).json({ error: error.message });
  }
  console.error(error);
  response.status(500).json({ error: 'Model execution failed.' });
});

app.listen(port, () => {
  console.log(`Smart Horizon backend listening on port ${port}`);
});
