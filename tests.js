require('dotenv').config()

const os = require("os");
const Web3 = require("web3");

const web3 = new Web3('wss://bsc.getblock.io/mainnet/?api_key=4a86ff72-bb5b-403f-a077-9548a88b2b20');
// const web3 = new Web3('wss://speedy-nodes-nyc.moralis.io/955149a22a9a018aea8cdb00/bsc/mainnet/ws');
// const web3 = new Web3('wss://dex.binance.org/api/ws');
const abiDecoder = require('abi-decoder');

// ADDRESS READ
const abiReadAndSellAuction = require("./abi.json");
abiDecoder.addABI(abiReadAndSellAuction);
const addressReadAndSellAuction = process.env.CONTRACT_ADDRESS

// ADDRESS BID
const contractAddressBid = process.env.CONTRACT_ADDRESS_BID
const abiBid = require("./abi_bid.json");
const contractBid = new web3.eth.Contract(abiBid, contractAddressBid);

// ACCOUNT BID
const account = web3.eth.accounts.privateKeyToAccount('0x' + process.env.AUTO_BUY_ADDRESS_PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;

const {Webhook, MessageBuilder} = require('discord-webhook-node');

const sequelize = require('./sequelize');
const {QueryTypes} = require('sequelize');

const PVU_FRONT_URL = 'https://marketplace.plantvsundead.com/offering/bundle#/plant/'
const PRICE_PVU_OUT = 500
const MONTH_HOURS = 720
const BSC_URL = 'https://bscscan.com/address/0x926eae99527a9503eaDb4c9e927f21f84f20C977#writeContract'

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
//         if (!err) {
//             console.log('error event:', event.transactionHash)
//         }
//     });
//     subscription.on('data', event => {
//         web3.eth.getTransaction(event.transactionHash, (err, transaction) => {
//             if (transaction) {
//                 processInput(transaction.input).catch(r => {
//                     console.log("DEU RUIM")
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
        myCache.set("transaction_" + transaction.hash, true, 60)

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
    let pvuData = await getPvuData(tokenID)

    if (pvuData) {
        return
    }

    getPlantId(tokenID, price, transaction)
}

async function getPvuData(tokenId) {
    let cache = myCache.get("get_pvu_data_" + tokenId)

    if (typeof cache !== "undefined") {
        console.log('get_pvu_data_from_cache')
        return cache
    }

    let query = await sequelize
        .query("SELECT * FROM pvus WHERE pvu_token_id = :pvu_token_id AND created_at >= DATE_SUB(CURDATE(), INTERVAL 3 DAY);",
            {
                type: QueryTypes.SELECT,
                plain: true,
                replacements: {pvu_token_id: tokenId},
                raw: true
            }
        );

    myCache.set("get_pvu_data_" + tokenId, query, 150)

    return query
}

async function getPvuDataInformation(plantIdNumber) {
    let cache = myCache.get("get_pvu_data_information_" + plantIdNumber)

    if (typeof cache !== "undefined") {
        console.log('get_pvu_data_information_from_cache')
        return cache
    }

    let query = await sequelize
        .query("SELECT * FROM pvu_nft_informations WHERE pvu_plant_id = :plant_id_number;",
            {
                type: QueryTypes.SELECT,
                plain: true,
                replacements: {plant_id_number: plantIdNumber},
                raw: true
            }
        );

    myCache.set("get_pvu_data_information_" + plantIdNumber, query, 50000)

    return query
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
    let pvuDataInformation = await getPvuDataInformation(plantPvuIdNumber)

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

    if (informations.buy === true && informations.reseller_price != null && informations.reseller_price > 0) {
        buyNFT(informations, transaction)
    }

    savePvuDataInformation(informations)
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function buyNFT(informations, transaction) {
    await sleep(500)

    contractBid.methods.bid(informations.pvu_token_id, informations.price).send({
        from: web3.eth.defaultAccount,
        gas: 300000,
        gasPrice: '7000000000',
        nonce: web3.utils.toHex(web3.eth.getTransactionCount(account.address))
    }).then(function (result) {
        console.log('SUCCESS BUY')
        sellNFT(informations)
    }).catch(function (err) {
        console.log('error BID:', err)
    });
}

async function sellNFT(informations) {
    let timeStampUTCNow = ((new Date((new Date(new Date().setDate(new Date().getDate() + 1000))).toUTCString())).getTime()) / 1000
    contractReadAndSellAuction.methods.createSaleAuction(
        informations.pvu_token_id,
        informations.reseller_price,
        informations.reseller_price,
        timeStampUTCNow
    ).send({
        from: web3.eth.defaultAccount,
        gas: 300000,
        gasPrice: '5000000000'
    }).then(function (result) {
        console.log('SUCCESS SELL: ', result)
    }).catch(function (err) {
        console.log('error SELL: ', err)
    });
}


async function getBasePriceByElement(element) {
    let cache = myCache.get("get_base_price_by_element_" + element)

    if (typeof cache !== "undefined") {
        console.log('get_base_price_by_element_from_cache')
        return cache
    }

    let query = await sequelize
        .query("SELECT * FROM pvu_element_prices WHERE element = :element;",
            {
                type: QueryTypes.SELECT,
                plain: true,
                replacements: {element: element},
                raw: true
            }
        );

    myCache.set("get_base_price_by_element_" + element, query, 30)

    return query
}


async function analyzeNFT(informations) {
    let basePriceInformation = await getBasePriceByElement(informations.plant_type)
    let basePrice = basePriceInformation ? basePriceInformation.price : 15

    informations.reseller_price = basePriceInformation.reseller_price

    // if (informations.status == 1 && informations.pvu_price <= basePrice && informations.pvu_le_hour_price <= 8
    //     && informations.hour <= 360 && informations.rent >= 0.15 && informations.plant_type == 'DARK'
    // ) {
    //     informations.discord_alert = 1
    //     informations.buy = false
    // }

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

    if (informations.status == 1 && informations.pvu_price <= basePrice && informations.plant_type == 'FIRE'
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

    if (informations.status == 1 && informations.pvu_price <= basePrice && informations.plant_type == 'WATER'
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

    if (informations.status == 1 && informations.pvu_price <= basePrice && informations.plant_type == 'ICE'
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

async function sendDiscordAlert(webhook, informations) {
    let discordMessageOptions = getDefaultObjDiscordMessage(webhook, informations)
    let hook = new Webhook(webhook.webhook);
    const embed = new MessageBuilder()
        .setTitle(discordMessageOptions.title)
        .setColor(discordMessageOptions.color)
        .setDescription(discordMessageOptions.description)
        .setText(discordMessageOptions.content)

    hook.send(embed);
}

function getDefaultObjDiscordMessage(webhook, informations) {
    return {
        content: webhook.free_trial ? ":warning: Get higher ROI notifications check out our #:bookmark:-plans" : '',
        title: "A good NFT opportunity appeared!",
        description: getDefaultDiscordMessage(webhook, informations),
        color: '7506394'
    }
}

function getDefaultDiscordMessage(webhook, informations) {
    let priceFixed = informations.pvu_price.toFixed(2)
    let commonOrMother = informations.pvu_type == 1 ? 'COMMON' : 'MOTHER'
    let leHourFixed = informations.le_hour.toFixed(2)
    let grossProfit = leHourFixed * MONTH_HOURS / PRICE_PVU_OUT
    grossProfit = grossProfit.toFixed(2)
    let monthlyROI = informations.rent * 100
    let monthlyROIFixed = monthlyROI.toFixed(2)
    let message = "PRICE (PVU): " + priceFixed + os.EOL + "TYPE: " + commonOrMother + os.EOL + "ELEMENT: " + informations.plant_type + os.EOL + "RARITY: " + informations.rarity + os.EOL + "LE: " + informations.le + "/" + informations.hour + " " + leHourFixed + " per hour" + os.EOL + "GROSS PROFIT: " + grossProfit + " PVU per month" + os.EOL + "MONTHLY RETURN OF INVESTMENT: " + monthlyROIFixed + "%" + os.EOL + "***(Base calculation " + PRICE_PVU_OUT + ":1 PVU)***" + os.EOL + "URL: " + informations.pvu_url + (webhook.free_trial ? os.EOL : '')

    if (webhook.free_trial) {
        message = message + getExtraMessage()
    }

    if (webhook.direct_bsc) {
        message = message + getBscMessage(informations)
    }

    return message
}

function getBscMessage(informations) {
    return os.EOL + os.EOL + "[Token ID: " + informations.pvu_token_id + "]" + os.EOL + "[Amount: " + informations.price + "]" + os.EOL + "BUY ON BSC: " + BSC_URL
}

function getExtraMessage() {
    return os.EOL + ":warning: Get higher ROI notifications check out our #:bookmark:-plans"
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