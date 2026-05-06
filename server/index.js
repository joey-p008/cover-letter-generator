require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const generateRoute = require('./routes/generate');
const connectionsRoute = require('./routes/connections');
const matchRoute = require('./routes/match');

const app = express();
const PORT = 3001;

app.use(cors({
  origin: 'http://localhost:5173',
  exposedHeaders: ['Content-Disposition', 'X-Letter-Text'],
}));
app.use(express.json());

app.use('/api/generate', generateRoute);
app.use('/api/connections', connectionsRoute);
app.use('/api/match', matchRoute);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
