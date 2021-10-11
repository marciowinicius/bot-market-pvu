require('dotenv').config()

const Web3 = require("web3");
const abiDecoder = require('abi-decoder');
const HDWalletProvider = require("@truffle/hdwallet-provider");
//load single private key as string
let providerSell = new HDWalletProvider(process.env.AUTO_BUY_ADDRESS_PRIVATE_KEY, "https://bsc-dataseed1.binance.org:443");
// const HDWalletProvider = require("@truffle/hdwallet-provider");
// const Provider = require('@truffle/hdwallet-provider');
// const clockAuctionContract = require('./build/contracts/ClockAuction.json');
// const Moralis  = require('moralis/node');
// Moralis.initialize("dXdrc5TOKtYEQnEqUaEkfOwIkIOywRfGuDQs68VW", "", "wxqB3Bq7vgQixlS0bgUfNsqGgnn3jvQCOmizMdM8");
// Moralis.serverURL = 'https://bplursgojzen.grandmoralis.com:2053/server'

// const web3 = new Web3('wss://bsc.getblock.io/mainnet/?api_key=4a86ff72-bb5b-403f-a077-9548a88b2b20');
// const web3 = new Web3('wss://speedy-nodes-nyc.moralis.io/955149a22a9a018aea8cdb00/bsc/mainnet/ws');
// const web3 = new Web3('wss://bsc-ws-node.nariox.org:443');
// const web3 = new Web3('wss://blue-polished-wind.bsc.quiknode.pro/10f483f667f9efc864efd96c0cb778df7fca0cc5/'); QUICK NODE
// const web3 = new Web3('wss://odenir:TupiDoBrasil25$@apis-sj.ankr.com/wss/9725e57cc94147e9ae4b43481a5a7cdf/7450cdc071967672eb2581cd3e7ca9c6/binance/full/main');
const providerWss = 'wss://bsc-ws-node.nariox.org:443';
const web3 = new Web3(providerWss);

// ADDRESS READ
const abiReadAndSellAuction = require("./abi.json");
abiDecoder.addABI(abiReadAndSellAuction);
const addressReadAndSellAuction = process.env.CONTRACT_ADDRESS

// ADDRESS BID
const contractAddressBid = process.env.CONTRACT_ADDRESS_BID
const abiBid = require("./abi_bid.json");
// const web3Bid = new Web3('https://bsc-dataseed1.binance.org:443');
// const contractBid = new web3Bid.eth.Contract(abiBid, contractAddressBid);

// ACCOUNT BID
const privateKeyAccountBid = '0x' + process.env.AUTO_BUY_ADDRESS_PRIVATE_KEY
// const provider = new Provider(privateKeyAccountBid, 'https://bsc-dataseed1.binance.org:443');
// const web3Bid = new Web3(providerBid);
const web3Sell = new Web3(providerSell);
// const networkId = await web3Bid.eth.net.getId();
const contractBid = new web3.eth.Contract(
    abiBid,
    contractAddressBid
);
const account = web3.eth.accounts.privateKeyToAccount(privateKeyAccountBid);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;

const sequelize = require('./sequelize');
const {QueryTypes} = require('sequelize');

const PVU_FRONT_URL = 'https://marketplace.plantvsundead.com/offering/bundle#/plant/'
const PRICE_PVU_OUT = 605
const MONTH_HOURS = 720

const NodeCache = require("node-cache");
const myCache = new NodeCache();

execute()

// async function execute() {
//     let options = {
//         fromBlock: 0,
//         address: contractAddressBid,    //Only get events from specific addresses
//         topics: ['0xa9c8dfcda5664a5a124c713e386da27de87432d5b668e79458501eb296389ba7']                              //What topics to subscribe to
//     };
//
//     let subscription = web3.eth.subscribe('logs', options, (err, event) => {
//         if (err) {
//             console.log('error event:', event.transactionHash)
//         }
//     });
//     subscription.on('data', event => {
//         // console.log(event)
//         web3.eth.getTransaction(event.transactionHash, (err, transaction) => {
//             if (transaction) {
//                 processInput(transaction).catch(r => {
//                     console.log("DEU RUIM: ", r)
//                 })
//             }
//         })
//     })
// }

async function execute() {
    web3.eth.subscribe('pendingTransactions', (err, txHash) => {
        if (err) console.log(err);
    }).on("data", function (txHash) {
        // console.log(txHash)
        web3.eth.getTransaction(txHash, async (err, transaction) => {
            if (transaction) {
                checkTransaction(transaction)
            }
        })
    });
}

async function checkTransaction(transaction) {
    let cache = await myCache.get("transaction_" + transaction.hash)
    if ((typeof cache === "undefined") && transaction.to && transaction.to.toLowerCase() == addressReadAndSellAuction) {
        processInput(transaction).catch(r => {
            console.log("DEU RUIM")
        })
    }
}

async function processInput(transaction) {
    const decodedData = abiDecoder.decodeMethod(transaction.input);

    if ((typeof decodedData.params == 'undefined') || decodedData.params == null) {
        return
    }

    let tokenID = ""
    let price = ""
    decodedData.params.forEach(element => {
        if (element.name === '_tokenId') {
            tokenID = element.value
        }
        if (element.name === '_startingPrice') {
            price = element.value
        }
    });
    if (tokenID === "") {
        return
    }

    getPlantId(tokenID, price, transaction)
}

function getPvuDataInformation(plantIdNumber) {
    let pvuDataInformation = {
        element: "FIRE",cycle: 48,common_base: 1,
        uncommon_base: 1,rare_base: 1, mythic_base: 1, le_factor: 1
    }

    if (plantIdNumber == 0){
        return {
            element: "FIRE",cycle: 48,common_base: 400,
            uncommon_base: 500,rare_base: 600, mythic_base: 800, le_factor: 1
        }
    }

    if (plantIdNumber == 1){
        return {
            element: "FIRE",cycle: 48,common_base: 400,
            uncommon_base: 500,rare_base: 600, mythic_base: 800, le_factor: 1
        }
    }

    if (plantIdNumber == 2){
        return {
            element: "ICE",cycle: 60,common_base: 500,
            uncommon_base: 610,rare_base: 680, mythic_base: 850, le_factor: 1
        }
    }

    if (plantIdNumber == 3){
        return {
            element: "ELETRIC",cycle: 48,common_base: 500,
            uncommon_base: 610,rare_base: 680, mythic_base: 850, le_factor: 1
        }
    }

    if (plantIdNumber == 4){
        return {
            element: "WATER",cycle: 108,common_base: 950,
            uncommon_base: 1100,rare_base: 1200, mythic_base: 1400, le_factor: 1
        }
    }

    if (plantIdNumber == 5){
        return {
            element: "WATER",cycle: 108,common_base: 950,
            uncommon_base: 1100,rare_base: 1200, mythic_base: 1400, le_factor: 1
        }
    }

    if (plantIdNumber == 6){
        return {
            element: "ICE",cycle: 60,common_base: 500,
            uncommon_base: 610,rare_base: 680, mythic_base: 850, le_factor: 1
        }
    }

    if (plantIdNumber == 7){
        return {
            element: "FIRE",cycle: 48,common_base: 400,
            uncommon_base: 500,rare_base: 600, mythic_base: 800, le_factor: 1
        }
    }

    if (plantIdNumber == 8){
        return {
            element: "ELETRIC",cycle: 48,common_base: 500,
            uncommon_base: 610,rare_base: 680, mythic_base: 850, le_factor: 1
        }
    }

    if (plantIdNumber == 9){
        return {
            element: "WIND",cycle: 72,common_base: 750,
            uncommon_base: 860,rare_base: 950, mythic_base: 1150, le_factor: 1
        }
    }

    if (plantIdNumber == 10){
        return {
            element: "WIND",cycle: 72,common_base: 750,
            uncommon_base: 860,rare_base: 950, mythic_base: 1150, le_factor: 1
        }
    }

    if (plantIdNumber == 11){
        return {
            element: "PARASITE",cycle: 120,common_base: 900,
            uncommon_base: 1010,rare_base: 1000, mythic_base: 1250, le_factor: 1
        }
    }

    if (plantIdNumber == 12){
        return {
            element: "PARASITE",cycle: 120,common_base: 900,
            uncommon_base: 1010,rare_base: 1000, mythic_base: 1250, le_factor: 1
        }
    }

    if (plantIdNumber == 13){
        return {
            element: "PARASITE",cycle: 120,common_base: 900,
            uncommon_base: 1010,rare_base: 1000, mythic_base: 1250, le_factor: 1
        }
    }

    if (plantIdNumber == 14){
        return {
            element: "DARK",cycle: 192,common_base: 1200,
            uncommon_base: 1900,rare_base: 2300, mythic_base: 2500, le_factor: 10
        }
    }

    if (plantIdNumber == 15){
        return {
            element: "ELETRIC",cycle: 48,common_base: 500,
            uncommon_base: 600,rare_base: 680, mythic_base: 850, le_factor: 1
        }
    }

    if (plantIdNumber == 16){
        return {
            element: "WIND",cycle: 96,common_base: 900,
            uncommon_base: 1010,rare_base: 1100, mythic_base: 1250, le_factor: 1
        }
    }

    if (plantIdNumber == 17){
        return {
            element: "FIRE",cycle: 72,common_base: 650,
            uncommon_base: 760,rare_base: 900, mythic_base: 1100, le_factor: 1
        }
    }

    if (plantIdNumber == 18){
        return {
            element: "LIGHT",cycle: 240,common_base: 1200,
            uncommon_base: 1310,rare_base: 1400, mythic_base: 1500, le_factor: 1
        }
    }

    if (plantIdNumber == 19){
        return {
            element: "LIGHT",cycle: 240,common_base: 1200,
            uncommon_base: 1310,rare_base: 1400, mythic_base: 1500, le_factor: 1
        }
    }

    if (plantIdNumber == 20){
        return {
            element: "LIGHT",cycle: 312,common_base: 1600,
            uncommon_base: 1710,rare_base: 1800, mythic_base: 2000, le_factor: 1
        }
    }

    if (plantIdNumber == 21){
        return {
            element: "LIGHT",cycle: 312,common_base: 1600,
            uncommon_base: 1710,rare_base: 1800, mythic_base: 2000, le_factor: 1
        }
    }

    if (plantIdNumber == 22){
        return {
            element: "PARASITE",cycle: 168,common_base: 1300,
            uncommon_base: 1410,rare_base: 1500, mythic_base: 1650, le_factor: 1
        }
    }

    if (plantIdNumber == 23){
        return {
            element: "PARASITE",cycle: 168,common_base: 1300,
            uncommon_base: 1410,rare_base: 1500, mythic_base: 1650, le_factor: 1
        }
    }

    if (plantIdNumber == 24){
        return {
            element: "PARASITE",cycle: 168,common_base: 1300,
            uncommon_base: 1410,rare_base: 1500, mythic_base: 1650, le_factor: 1
        }
    }

    if (plantIdNumber == 25){
        return {
            element: "METAL",cycle: 336,common_base: 3500,
            uncommon_base: 4300,rare_base: 4800, mythic_base: 5200, le_factor: 10
        }
    }

    if (plantIdNumber == 26){
        return {
            element: "METAL",cycle: 336,common_base: 3500,
            uncommon_base: 4300,rare_base: 4800, mythic_base: 5200, le_factor: 10
        }
    }

    if (plantIdNumber == 27){
        return {
            element: "METAL",cycle: 480,common_base: 5500,
            uncommon_base: 6400,rare_base: 6800, mythic_base: 7100, le_factor: 10
        }
    }

    if (plantIdNumber == 28){
        return {
            element: "METAL",cycle: 480,common_base: 5500,
            uncommon_base: 6400,rare_base: 6800, mythic_base: 7100, le_factor: 10
        }
    }

    if (plantIdNumber == 29){
        return {
            element: "ICE",cycle: 96,common_base: 800,
            uncommon_base: 910,rare_base: 1000, mythic_base: 1250, le_factor: 1
        }
    }

    if (plantIdNumber == 30){
        return {
            element: "FIRE",cycle: 72,common_base: 650,
            uncommon_base: 760,rare_base: 900, mythic_base: 1100, le_factor: 1
        }
    }

    if (plantIdNumber == 31){
        return {
            element: "DARK",cycle: 192,common_base: 1200,
            uncommon_base: 1900,rare_base: 2300, mythic_base: 2500, le_factor: 10
        }
    }

    if (plantIdNumber == 32){
        return {
            element: "ELETRIC",cycle: 60,common_base: 650,
            uncommon_base: 760,rare_base: 900, mythic_base: 1100, le_factor: 1
        }
    }

    if (plantIdNumber == 33){
        return {
            element: "DARK",cycle: 216,common_base: 1400,
            uncommon_base: 2100,rare_base: 2500, mythic_base: 2800, le_factor: 10
        }
    }

    if (plantIdNumber == 34){
        return {
            element: "ELETRIC",cycle: 60,common_base: 650,
            uncommon_base: 760,rare_base: 900, mythic_base: 1100, le_factor: 1
        }
    }

    if (plantIdNumber == 35){
        return {
            element: "DARK",cycle: 216,common_base: 1400,
            uncommon_base: 2100,rare_base: 2500, mythic_base: 2800, le_factor: 10
        }
    }

    if (plantIdNumber == 36){
        return {
            element: "WATER",cycle: 108,common_base: 950,
            uncommon_base: 1100,rare_base: 1200, mythic_base: 1400, le_factor: 1
        }
    }

    if (plantIdNumber == 37){
        return {
            element: "WIND",cycle: 96,common_base: 900,
            uncommon_base: 1010,rare_base: 1100, mythic_base: 1250, le_factor: 1
        }
    }

    if (plantIdNumber == 38){
        return {
            element: "WATER",cycle: 120,common_base: 1050,
            uncommon_base: 1200,rare_base: 1300, mythic_base: 1500, le_factor: 1
        }
    }

    if (plantIdNumber == 39){
        return {
            element: "WATER",cycle: 120,common_base: 1050,
            uncommon_base: 1200,rare_base: 1300, mythic_base: 1500, le_factor: 1
        }
    }

    if (plantIdNumber == 90){
        return {
            element: "FIRE",cycle: 48,common_base: 750,
            uncommon_base: 1100,rare_base: 1300, mythic_base: 1500, le_factor: 5
        }
    }

    if (plantIdNumber == 91){
        return {
            element: "LIGHT",cycle: 240,common_base: 1400,
            uncommon_base: 1750,rare_base: 1940, mythic_base: 2120, le_factor: 5
        }
    }

    if (plantIdNumber == 92){
        return {
            element: "ICE",cycle: 96,common_base: 1050,
            uncommon_base: 1400,rare_base: 1600, mythic_base: 1800, le_factor: 5
        }
    }

    if (plantIdNumber == 93){
        return {
            element: "DARK",cycle: 216,common_base: 2600,
            uncommon_base: 2950,rare_base: 3100, mythic_base: 3300, le_factor: 5
        }
    }

    return pvuDataInformation
}

const contractReadAndSellAuction = new web3.eth.Contract(abiReadAndSellAuction, addressReadAndSellAuction)
const getPlantId = async function (tokenId, price, transaction) {
    contractReadAndSellAuction.methods.getPlant(tokenId).call().then(data => {
        getPlantInformations(data.plantId, price, tokenId, transaction)
    })
}

const getPlantInformations = async function (plantId, price, tokenId, transaction) {
    let realPrice = parsePrice(price)
    let plantPvuIdNumber = getPlantPvuIdNumber(plantId)
    let pvuDataInformation = getPvuDataInformation(plantPvuIdNumber)

    let plantPvuTypeNumber = getPlantPvuTypeNumber(plantId)
    let plantPvuRarityNumber = getPlantPvuRarityNumber(plantId)
    let plantPvuRarityLE = getPlantPvuRarityLE(plantPvuRarityNumber, pvuDataInformation)

    let leHour = parseFloat(parseFloat(plantPvuRarityLE.le) / parseFloat(pvuDataInformation.cycle))
    let informations = {
        pvu_id: plantId,
        pvu_token_id: tokenId,
        status: 1,
        pvu_type: plantPvuTypeNumber,
        le: plantPvuRarityLE.le,
        hour: pvuDataInformation.cycle,
        le_hour: leHour,
        pvu_price: realPrice,
        pvu_le_hour_price: realPrice / leHour,
        discord_alert: 0,
        pvu_url: PVU_FRONT_URL + plantId,
        rent: (leHour * MONTH_HOURS) / PRICE_PVU_OUT / realPrice,
        plant_type: pvuDataInformation.element,
        icon_url: null,
        rarity: plantPvuRarityLE.rarity,
        pvu_json: null,
        price: price,
        buy: false,
        reseller_price: null,
        gasLimit: 0,
        gasUsed: 0
    }

    informations = await analyzeNFT(informations)

    // buyNFT(informations)
    // console.log(informations)

    if (informations.buy === true && informations.reseller_price != null && informations.reseller_price > 0) {
        buyNFT(informations, transaction)
    }

    savePvuDataInformation(informations)
}

async function estimateGas(data, nonce) {
    web3.eth.estimateGas({
        "from": account.address,
        "nonce": nonce,
        "to": contractAddressBid,
        "data": data
    }).then(r =>
        console.log(r)
    ).catch(err =>
        console.log(err)
    );
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function buyNFT(informations, transaction) {
    // let nonce = (await web3.eth.getTransactionCount(account.address)) + 1
    // var block = await web3.eth.getBlock("latest");
    // var gasLimit = block.gasLimit/block.transactions.length;
    // console.log('nonce: ',nonce)
    let contractBidData = contractBid.methods.bid(informations.pvu_token_id, informations.price).encodeABI()

    let tx = {
        // this could be provider.addresses[0] if it exists
        // from: account.address,
        // target address, this could be a smart contract address
        to: contractAddressBid,
        // optional if you want to specify the gas limit
        gas: web3.utils.toHex(600000),
        gasPrice: web3.utils.toHex(await web3.utils.toWei('6', 'gwei')),
        contractAddress: contractAddressBid,
        // nonce: 58,
        // optional if you are invoking say a payable function
        // value: web3.utils.toHex(informations.reseller_price),
        // this encodes the ABI of the method and the arguements
        data: contractBidData,
        handleRevert: true
    };

    // let txReceipt = await getTransactionReceipt(transaction.hash)
    // console.log('tx receipt test:', txReceipt)

    const signPromise = web3.eth.accounts.signTransaction(tx, privateKeyAccountBid);

    signPromise.then((signedTx) => {
        console.log(signedTx)
        // raw transaction string may be available in .raw or
        // .rawTransaction depending on which signTransaction
        // function was called
        let sentTx = web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        sentTx.on("receipt", receipt => {
            console.log('SUCCESS BUY: ', receipt)
            sellNFT(informations)
        });
        sentTx.on("error", err => {
            console.log('error BID:', err)
        });
    }).catch((err) => {
        console.log('error sign promise:', err)
    });
}

async function sellNFT(informations) {
    let timeStampUTCNow = ((new Date((new Date(new Date().setDate(new Date().getDate() + 1000))).toUTCString())).getTime()) / 1000
    let contractSellData = contractReadAndSellAuction.methods.createSaleAuction(
        informations.pvu_token_id,
        informations.reseller_price,
        informations.reseller_price,
        timeStampUTCNow
    ).encodeABI()

    let tx = {
        // this could be provider.addresses[0] if it exists
        // from: account.address,
        // target address, this could be a smart contract address
        to: addressReadAndSellAuction,
        // optional if you want to specify the gas limit
        gas: web3Sell.utils.toHex(250000),
        gasPrice: web3Sell.utils.toHex(await web3Sell.utils.toWei('5', 'gwei')),
        contractAddress: addressReadAndSellAuction,
        // nonce: 58,
        // optional if you are invoking say a payable function
        // value: web3.utils.toHex(informations.reseller_price),
        // this encodes the ABI of the method and the arguements
        data: contractSellData,
        handleRevert: true
    };

    const signPromise = web3Sell.eth.accounts.signTransaction(tx, privateKeyAccountBid);

    signPromise.then((signedTx) => {
        console.log(signedTx)
        // raw transaction string may be available in .raw or
        // .rawTransaction depending on which signTransaction
        // function was called
        let sentTx = web3Sell.eth.sendSignedTransaction(signedTx.rawTransaction);
        sentTx.on("receipt", receipt => {
            console.log('SUCCESS SELL: ', receipt)
        });
        sentTx.on("error", err => {
            console.log('error SELL:', err)
        });
    }).catch((err) => {
        console.log('error sign promise SELL:', err)
    });
}

function getBasePriceByElementAndRarity(element, rarity) {
    let basePriceInformation = {
        price: parseFloat("5"),
        reseller_price: "10000000000000000000"
    }

    if (rarity === "COMMON") {
        if (element === "DARK") {
            return {
                price: parseFloat(process.env.BUY_PRICE_COMMON_DARK),
                reseller_price: process.env.RESELLER_PRICE_COMMON_DARK
            }
        }
        if (element === "LIGHT") {
            return {
                price: parseFloat(process.env.BUY_PRICE_COMMON_LIGHT),
                reseller_price: process.env.RESELLER_PRICE_COMMON_LIGHT
            }
        }
        if (element === "FIRE") {
            return {
                price: parseFloat(process.env.BUY_PRICE_COMMON_FIRE),
                reseller_price: process.env.RESELLER_PRICE_COMMON_FIRE
            }
        }
        if (element === "WATER") {
            return {
                price: parseFloat(process.env.BUY_PRICE_COMMON_WATER),
                reseller_price: process.env.RESELLER_PRICE_COMMON_WATER
            }
        }
        if (element === "ICE") {
            return {
                price: parseFloat(process.env.BUY_PRICE_COMMON_ICE),
                reseller_price: process.env.RESELLER_PRICE_COMMON_ICE
            }
        }
        if (element === "ELETRIC") {
            return {
                price: parseFloat(process.env.BUY_PRICE_COMMON_ELETRIC),
                reseller_price: process.env.RESELLER_PRICE_COMMON_ELETRIC
            }
        }
        if (element === "METAL") {
            return {
                price: parseFloat(process.env.BUY_PRICE_COMMON_METAL),
                reseller_price: process.env.RESELLER_PRICE_COMMON_METAL
            }
        }
        if (element === "WIND") {
            return {
                price: parseFloat(process.env.BUY_PRICE_COMMON_WIND),
                reseller_price: process.env.RESELLER_PRICE_COMMON_WIND
            }
        }
        if (element === "PARASITE") {
            return {
                price: parseFloat(process.env.BUY_PRICE_COMMON_PARASITE),
                reseller_price: process.env.RESELLER_PRICE_COMMON_PARASITE
            }
        }
    }

    if (rarity === "UNCOMMON") {
        if (element === "DARK") {
            return {
                price: parseFloat(process.env.BUY_PRICE_UNCOMMON_DARK),
                reseller_price: process.env.RESELLER_PRICE_UNCOMMON_DARK
            }
        }
        if (element === "LIGHT") {
            return {
                price: parseFloat(process.env.BUY_PRICE_UNCOMMON_LIGHT),
                reseller_price: process.env.RESELLER_PRICE_UNCOMMON_LIGHT
            }
        }
        if (element === "FIRE") {
            return {
                price: parseFloat(process.env.BUY_PRICE_UNCOMMON_FIRE),
                reseller_price: process.env.RESELLER_PRICE_UNCOMMON_FIRE
            }
        }
        if (element === "WATER") {
            return {
                price: parseFloat(process.env.BUY_PRICE_UNCOMMON_WATER),
                reseller_price: process.env.RESELLER_PRICE_UNCOMMON_WATER
            }
        }
        if (element === "ICE") {
            return {
                price: parseFloat(process.env.BUY_PRICE_UNCOMMON_ICE),
                reseller_price: process.env.RESELLER_PRICE_UNCOMMON_ICE
            }
        }
        if (element === "ELETRIC") {
            return {
                price: parseFloat(process.env.BUY_PRICE_UNCOMMON_ELETRIC),
                reseller_price: process.env.RESELLER_PRICE_UNCOMMON_ELETRIC
            }
        }
        if (element === "METAL") {
            return {
                price: parseFloat(process.env.BUY_PRICE_UNCOMMON_METAL),
                reseller_price: process.env.RESELLER_PRICE_UNCOMMON_METAL
            }
        }
        if (element === "WIND") {
            return {
                price: parseFloat(process.env.BUY_PRICE_UNCOMMON_WIND),
                reseller_price: process.env.RESELLER_PRICE_UNCOMMON_WIND
            }
        }
        if (element === "PARASITE") {
            return {
                price: parseFloat(process.env.BUY_PRICE_UNCOMMON_PARASITE),
                reseller_price: process.env.RESELLER_PRICE_UNCOMMON_PARASITE
            }
        }
    }

    if (rarity === "RARE") {
        if (element === "DARK") {
            return {
                price: parseFloat(process.env.BUY_PRICE_RARE_DARK),
                reseller_price: process.env.RESELLER_PRICE_RARE_DARK
            }
        }
        if (element === "LIGHT") {
            return {
                price: parseFloat(process.env.BUY_PRICE_RARE_LIGHT),
                reseller_price: process.env.RESELLER_PRICE_RARE_LIGHT
            }
        }
        if (element === "FIRE") {
            return {
                price: parseFloat(process.env.BUY_PRICE_RARE_FIRE),
                reseller_price: process.env.RESELLER_PRICE_RARE_FIRE
            }
        }
        if (element === "WATER") {
            return {
                price: parseFloat(process.env.BUY_PRICE_RARE_WATER),
                reseller_price: process.env.RESELLER_PRICE_RARE_WATER
            }
        }
        if (element === "ICE") {
            return {
                price: parseFloat(process.env.BUY_PRICE_RARE_ICE),
                reseller_price: process.env.RESELLER_PRICE_RARE_ICE
            }
        }
        if (element === "ELETRIC") {
            return {
                price: parseFloat(process.env.BUY_PRICE_RARE_ELETRIC),
                reseller_price: process.env.RESELLER_PRICE_RARE_ELETRIC
            }
        }
        if (element === "METAL") {
            return {
                price: parseFloat(process.env.BUY_PRICE_RARE_METAL),
                reseller_price: process.env.RESELLER_PRICE_RARE_METAL
            }
        }
        if (element === "WIND") {
            return {
                price: parseFloat(process.env.BUY_PRICE_RARE_WIND),
                reseller_price: process.env.RESELLER_PRICE_RARE_WIND
            }
        }
        if (element === "PARASITE") {
            return {
                price: parseFloat(process.env.BUY_PRICE_RARE_PARASITE),
                reseller_price: process.env.RESELLER_PRICE_RARE_PARASITE
            }
        }
    }

    if (rarity === "MYTHIC") {
        if (element === "DARK") {
            return {
                price: parseFloat(process.env.BUY_PRICE_MYTHIC_DARK),
                reseller_price: process.env.RESELLER_PRICE_MYTHIC_DARK
            }
        }
        if (element === "LIGHT") {
            return {
                price: parseFloat(process.env.BUY_PRICE_MYTHIC_LIGHT),
                reseller_price: process.env.RESELLER_PRICE_MYTHIC_LIGHT
            }
        }
        if (element === "FIRE") {
            return {
                price: parseFloat(process.env.BUY_PRICE_MYTHIC_FIRE),
                reseller_price: process.env.RESELLER_PRICE_MYTHIC_FIRE
            }
        }
        if (element === "WATER") {
            return {
                price: parseFloat(process.env.BUY_PRICE_MYTHIC_WATER),
                reseller_price: process.env.RESELLER_PRICE_MYTHIC_WATER
            }
        }
        if (element === "ICE") {
            return {
                price: parseFloat(process.env.BUY_PRICE_MYTHIC_ICE),
                reseller_price: process.env.RESELLER_PRICE_MYTHIC_ICE
            }
        }
        if (element === "ELETRIC") {
            return {
                price: parseFloat(process.env.BUY_PRICE_MYTHIC_ELETRIC),
                reseller_price: process.env.RESELLER_PRICE_MYTHIC_ELETRIC
            }
        }
        if (element === "METAL") {
            return {
                price: parseFloat(process.env.BUY_PRICE_MYTHIC_METAL),
                reseller_price: process.env.RESELLER_PRICE_MYTHIC_METAL
            }
        }
        if (element === "WIND") {
            return {
                price: parseFloat(process.env.BUY_PRICE_MYTHIC_WIND),
                reseller_price: process.env.RESELLER_PRICE_MYTHIC_WIND
            }
        }
        if (element === "PARASITE") {
            return {
                price: parseFloat(process.env.BUY_PRICE_MYTHIC_PARASITE),
                reseller_price: process.env.RESELLER_PRICE_MYTHIC_PARASITE
            }
        }
    }

    return basePriceInformation
}


async function analyzeNFT(informations) {
    let basePriceInformation = getBasePriceByElementAndRarity(informations.plant_type, informations.rarity)
    let basePrice = basePriceInformation ? basePriceInformation.price : 10

    informations.reseller_price = basePriceInformation.reseller_price

    if (informations.status == 1 && informations.pvu_price <= basePrice && informations.plant_type == 'DARK'
    ) {
        informations.discord_alert = 1
        informations.buy = true
    }

    // if (informations.status == 1 && informations.pvu_price <= basePrice && informations.pvu_le_hour_price <= 8
    //     && informations.hour <= 360 && informations.rent >= 0.15 && informations.plant_type == 'LIGHT'
    // ) {
    //     informations.discord_alert = 1
    //     informations.buy = false
    // }

    if (informations.status == 1 && informations.pvu_price <= basePrice && informations.plant_type == 'LIGHT'
    ) {
        informations.discord_alert = 1
        informations.buy = true
    }

    // if (informations.status == 1 && informations.pvu_price <= basePrice && informations.pvu_le_hour_price <= 8
    //     && informations.hour <= 168 && informations.rent >= 0.15 && informations.plant_type == 'FIRE'
    // ) {
    //     informations.discord_alert = 1
    //     informations.buy = true
    // }

    if (informations.status == 1 && informations.pvu_price <= basePrice && informations.le_hour >= 10
        && informations.plant_type == 'FIRE'
    ) {
        informations.discord_alert = 1
        informations.buy = true
    }

    // if (informations.status == 1 && informations.pvu_price <= basePrice && informations.pvu_le_hour_price <= 8
    //     && informations.hour <= 168 && informations.rent >= 0.15 && informations.plant_type == 'WATER'
    // ) {
    //     informations.discord_alert = 1
    //     informations.buy = true
    // }

    if (informations.status == 1 && informations.pvu_price <= basePrice && informations.le_hour >= 9.5
        && informations.plant_type == 'WATER'
    ) {
        informations.discord_alert = 1
        informations.buy = true
    }

    // if (informations.status == 1 && informations.pvu_price <= basePrice && informations.pvu_le_hour_price <= 8
    //     && informations.hour <= 168 && informations.rent >= 0.15 && informations.plant_type == 'ICE'
    // ) {
    //     informations.discord_alert = 1
    //     informations.buy = false
    // }

    if (informations.status == 1 && informations.pvu_price <= basePrice && informations.le_hour >= 9
        && informations.plant_type == 'ICE'
    ) {
        informations.discord_alert = 1
        informations.buy = true
    }

    // if (informations.status == 1 && informations.pvu_price <= basePrice && informations.pvu_le_hour_price <= 8
    //     && informations.hour <= 168 && informations.rent >= 0.15 && informations.plant_type == 'ELETRIC'
    // ) {
    //     informations.discord_alert = 1
    //     informations.buy = false
    // }

    if (informations.status == 1 && informations.pvu_price <= basePrice && informations.plant_type == 'ELETRIC'
    ) {
        informations.discord_alert = 1
        informations.buy = true
    }

    // if (informations.status == 1 && informations.pvu_price <= basePrice && informations.pvu_le_hour_price <= 8
    //     && informations.hour <= 480 && informations.rent >= 0.15 && informations.plant_type == 'METAL'
    // ) {
    //     informations.discord_alert = 1
    //     informations.buy = false
    // }

    if (informations.status == 1 && informations.pvu_price <= basePrice && informations.plant_type == 'METAL'
    ) {
        informations.discord_alert = 1
        informations.buy = true
    }

    // if (informations.status == 1 && informations.pvu_price <= basePrice && informations.pvu_le_hour_price <= 8
    //     && informations.hour <= 168 && informations.rent >= 0.15 && informations.plant_type == 'WIND'
    // ) {
    //     informations.discord_alert = 1
    //     informations.buy = false
    // }

    if (informations.status == 1 && informations.pvu_price <= basePrice && informations.plant_type == 'WIND'
    ) {
        informations.discord_alert = 1
        informations.buy = true
    }

    // if (informations.status == 1 && informations.pvu_price <= basePrice && informations.pvu_le_hour_price <= 8
    //     && informations.hour <= 168 && informations.rent >= 0.15 && informations.plant_type == 'PARASITE'
    // ) {
    //     informations.discord_alert = 1
    //     informations.buy = true
    // }

    if (informations.status == 1 && informations.pvu_price <= basePrice && informations.plant_type == 'PARASITE'
    ) {
        informations.discord_alert = 1
        informations.buy = true
    }

    return informations
}

function parsePrice(price) {
    let priceDecimals = price.substr(price.length - 18)
    let priceDozens = price.substr(0, price.length - 18)

    return parseFloat("" + priceDozens + "." + priceDecimals)
}

async function savePvuDataInformation(informations) {
    sequelize
        .query("INSERT INTO pvus (pvu_id, pvu_token_id, status, pvu_type, le, hour, le_hour, pvu_price, pvu_le_hour_price, pvu_url, created_at, updated_at, discord_alert, rent, plant_type, icon_url, rarity, pvu_json) " +
            "VALUES (:pvu_id, :pvu_token_id, :status, :pvu_type, :le, :hour, :le_hour, :pvu_price, :pvu_le_hour_price, :pvu_url, NOW(), NOW(), :discord_alert, :rent, :plant_type, :icon_url, :rarity, :pvu_json);",
            {
                type: QueryTypes.INSERT,
                replacements: informations,
                raw: true
            }
        );
}

const getPlantPvuRarityLE = function (rarityNumber, pvuDataInformation) {
    let rarity = ''
    let le = 0
    if (rarityNumber >= 0 && rarityNumber <= 59) {
        rarity = 'COMMON'
        le = pvuDataInformation.common_base + (pvuDataInformation.le_factor * (rarityNumber - 0))
    } else if (rarityNumber >= 60 && rarityNumber <= 88) {
        rarity = 'UNCOMMON'
        le = pvuDataInformation.uncommon_base + (pvuDataInformation.le_factor * (rarityNumber - 60))
    } else if (rarityNumber >= 89 && rarityNumber <= 98) {
        rarity = 'RARE'
        le = pvuDataInformation.rare_base + (pvuDataInformation.le_factor * (rarityNumber - 89))
    } else {
        rarity = 'MYTHIC'
        le = pvuDataInformation.mythic_base + (pvuDataInformation.le_factor * (rarityNumber - 99))
    }

    return {rarity: rarity, le: le}
}

const getPlantPvuTypeNumber = function (plantId) {
    return plantId.charAt(0)
}

const getPlantPvuIdNumber = function (plantId) {
    return plantId.substr(3, 2)
}

const getPlantPvuRarityNumber = function (plantId) {
    return plantId.substr(6, 2)
}