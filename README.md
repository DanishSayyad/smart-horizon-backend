# Smart Horizon backend

## Run

```bash
npm install
npm start
```

The server listens on port `8000` by default. Set `PORT` to override it.

## CSV inference endpoint

Send a CSV as the `file` multipart form field:

```bash
curl -X POST -F "file=@sample/sample_output.csv" http://localhost:8000/predict
```

The response is CSV. `track1.py` currently returns the bundled
`sample/sample_output.csv`; the uploaded file is passed to it as its first
command-line argument. The Node server forwards the Python process output
and does not read the sample output itself.
