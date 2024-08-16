const finnhub = require('finnhub');

const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = "cqtp1f9r01qijbg18b10cqtp1f9r01qijbg18b1g";
const finnhubClient = new finnhub.DefaultApi();

const searchStocks = async (query) => {
  try {
    finnhubClient.stockSymbols("US", { exchange: query }, (error, data, response) => {
      if (error) {
        console.error('Error fetching stock data:', error);
      } else {
        console.log('Stock data:', data);
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
  }
};

// Call the search function with your desired query
searchStocks("BO");  // Replace "US" with your search query