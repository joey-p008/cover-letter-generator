require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const generateRoute = require('./routes/generate');
const generateDocxRoute = require('./routes/generateDocx');
const connectionsRoute = require('./routes/connections');
const matchRoute = require('./routes/match');
const fetchJobRoute = require('./routes/fetchJob');

const app = express();
const PORT = 3001;

app.use(cors({
  origin: 'http://localhost:5173',
  exposedHeaders: ['Content-Disposition'],
}));
app.use(express.json());

// Mount more-specific paths before less-specific ones
app.use('/api/generate/docx', generateDocxRoute);
app.use('/api/generate', generateRoute);
app.use('/api/connections', connectionsRoute);
app.use('/api/match', matchRoute);
app.use('/api/fetch-job', fetchJobRoute);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
