const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const flash = require('connect-flash');
const authMiddleware = require('./middleware/auth');
const { User } = require("./db");
const axios = require('axios');
const app = express();

// Finnhub setup
const finnhub = require('finnhub');

const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = "cqtp1f9r01qijbg18b10cqtp1f9r01qijbg18b1g"; // Replace with your Finnhub API key

const finnhubClient = new finnhub.DefaultApi();

const searchStocks = (query, callback) => {
    finnhubClient.symbolSearch(query, (error, data, response) => {
        if (error) {
            console.error('Error fetching stock data:', error);
            callback(error, null);
        } else {
            callback(null, data);
        }
    });
};
//mongoose setup
mongoose.connect('mongodb+srv://Apratim:k9aZ17vi3x8y4SVZ@atlascluster.mz70pny.mongodb.net/')
    .then(() => {
        console.log('Connected to MongoDB');
    }).catch((err) => {
        console.error('Error connecting to MongoDB', err);
    });

//app setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));
app.use(flash());

app.post('/reset-portfolio', async (req, res) => {
    try {
      const userId = req.body.userId; // or wherever you get the userId
      const user = await User.findById(userId); // Ensure you're fetching the user correctly
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Reset the user's portfolio and balance
      user.balance = 10000000; // Example balance reset
      user.portfolio = []; // Reset portfolio
      await user.save();
  
      res.status(200).json({ message: 'Portfolio reset successfully' });
    } catch (err) {
      console.error('Error resetting portfolio:', err);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
  
//route home
app.get('/', (req, res) => {
    res.render('mainhome', { 
        message: req.flash('message'), 
        user: req.session.userEmail // Pass user email to the template
    });
});
//route sign up
app.get('/signup', (req, res) => {
    res.render('signup', { message: req.flash('message') });
});
//route signup 
app.post('/signup', async (req, res) => {
    const { email, password, firstName, lastName } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, firstName, lastName, password: hashedPassword });

    try {
        await newUser.save();
        req.flash('message', 'Account created successfully, please login');
        res.redirect('/signup');
    } catch (err) {
        console.log(err);
        req.flash('message', 'Error creating account');
        res.redirect('/signup');
    }
});
//route login
app.get('/login', (req, res) => {
    res.render('login', { message: req.flash('message') });
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.log(err);
        }
        res.redirect('/');
    });
});

//route login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const foundUser = await User.findOne({ email: email });

        if (foundUser) {
            const validPassword = await bcrypt.compare(password, foundUser.password);
            if (validPassword) {
                req.session.userId = foundUser._id; // Store user ID in session
                req.session.userEmail = foundUser.email; // Store user email in session
                req.flash('message', 'Logged in successfully');
                res.redirect('/'); // Redirect to main home page after login
            } else {
                req.flash('message', 'Incorrect password');
                res.redirect('/login');
            }
        } else {
            req.flash('message', 'No user with that email. Please Sign Up');
            res.redirect('/login');
        }
    } catch (err) {
        console.log(err);
        req.flash('message', 'An error occurred');
        res.redirect('/login');
    }
});

//home route
app.get('/home', authMiddleware, (req, res) => {
    res.render('home');
});

app.get('/portfolio', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            req.flash('message', 'User not found');
            return res.redirect('/login');
        }
        res.render('portfolio-scorecard', { user });
    } catch (err) {
        console.error(err);
        req.flash('message', 'An error occurred');
        res.redirect('/login');
    }
});

//trade route
app.get('/trade', (req, res) => {
    res.render('trade_STOCKS');
});

app.get('/portfolio/activities', (req, res) => {
    res.render('portfolio-activities');
});

/*************************************************************TRADING*********************************************************/

app.get('/api/search-stocks', async (req, res) => {
    const query = req.query.query;
    try {
        searchStocks(query, (err, data) => {
            if (err) {
                res.status(500).json({ error: 'Failed to fetch stock search results' });
            } else {
                res.json(data);
            }
        });
    } catch (err) {
        console.error('Error fetching stock search results:', err);
        res.status(500).json({ error: 'Failed to fetch stock search results' });
    }
});

app.post('/trade/buy-sell', async (req, res) => {
    const { symbol, quantity, action } = req.body;
    const userEmail = req.session.userEmail;

    if (!userEmail) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const user = await User.findOne({ email: userEmail });

        if (!user) {
            return res.status(404).send('User not found');
        }

        const stockPrice = await getStockPrice(symbol);

        if (!stockPrice) {
            return res.status(400).send('Invalid stock symbol');
        }

        const totalPrice = stockPrice * quantity;

        if (action === 'buy') {
            if (user.balance < totalPrice) {
                return res.status(400).send('Insufficient funds');
            }
            user.balance -= totalPrice;
            user.portfolio.push({ symbol, quantity, price: stockPrice });
        } else if (action === 'sell') {
            const stock = user.portfolio.find(stock => stock.symbol === symbol);
            if (!stock || stock.quantity < quantity) {
                return res.status(400).send('Not enough stock to sell');
            }
            user.balance += totalPrice;
            stock.quantity -= quantity;
            if (stock.quantity === 0) {
                user.portfolio = user.portfolio.filter(s => s.symbol !== symbol);
            }
        } else {
            return res.status(400).send('Invalid action');
        }

        await user.save();
        res.redirect('/');
    } catch (err) {
        console.error('Error handling trade:', err);
        res.status(500).send('Internal server error');
    }
});

async function getStockPrice(symbol) {
    return new Promise((resolve, reject) => {
        finnhubClient.quote(symbol, (error, data, response) => {
            if (error) {
                console.error('Error fetching stock price:', error);
                return reject(null);
            }
            if (data.c) {
                resolve(data.c); // Current price
            } else {
                reject(null);
            }
        });
    });
}

/*************************************************************TRADING*********************************************************/
app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});