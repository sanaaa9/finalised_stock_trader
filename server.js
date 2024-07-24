const express = require('express');
const path = require('path');
const app = express();
const port = 3000;


app.use(express.static('public'));


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
});


app.get('/portfolio', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'portfolio-scorecard.html'));
});


app.get('/trade', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'trade_STOCKS.html'));
});

app.get('/portfolio/activities', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'portfolio-activities.html'));
});



app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});