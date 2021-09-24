// In a node environment
const Moralis  = require('moralis/node');

// get mainnet transactions for the current user
const transactions = await Moralis.Web3API.account.getTransactions();
console.log(transactions)

// get BSC transactions for a given address
// with most recent transactions appearing first
// const options = { chain: "bsc", address: "0x5ab19e7091dd208f352f8e727b6dcc6f8abb6275", order: "desc", limit: "5", from_block: "0", to_block: "9999999999999999999999" };
// const transactions = await Moralis.Web3API.account.getTransactions(options);
//
// console.log(transactions)