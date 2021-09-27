require('dotenv').config()

const os = require("os");
const Web3 = require("web3");

const web3 = new Web3('wss://bsc.getblock.io/mainnet/?api_key=4a86ff72-bb5b-403f-a077-9548a88b2b20');
const abiDecoder = require('abi-decoder');

// ADDRESS READ
const abiReadAuction = require("./abi.json");
abiDecoder.addABI(abiReadAuction);
const addressReadAuction = process.env.CONTRACT_ADDRESS

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

async function execute() {
    web3.eth.subscribe('pendingTransactions', (err, txHash) => {
        if (err) console.log(err);
    }).on("data", function (txHash) {
        web3.eth.getTransaction(txHash, (err, transaction) => {
            if (transaction) {
                let cache = myCache.get("transaction_" + transaction.hash);
                if (cache == undefined && transaction.to && transaction.to.toLowerCase() == addressReadAuction) {
                    // console.log(transaction.hash)
                    myCache.set("transaction_" + transaction.hash, true, 10000)

                    processInput(transaction.input).catch(r => {
                        console.log("DEU RUIM")
                    })
                }
            }
        })
    });
}

async function processInput(input) {
    const decodedData = abiDecoder.decodeMethod(input);

    if (typeof decodedData.params == 'undefined' && decodedData.params == null) {
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

    getPlantId(tokenID, price)
}

async function getPvuData(tokenId) {
    return await sequelize
        .query("SELECT * FROM pvus WHERE pvu_token_id = :pvu_token_id AND created_at >= DATE_SUB(CURDATE(), INTERVAL 3 DAY);",
            {
                type: QueryTypes.SELECT,
                plain: true,
                replacements: {pvu_token_id: tokenId},
                raw: true
            }
        );
}

async function getPvuDataInformation(plantIdNumber) {
    return await sequelize
        .query("SELECT * FROM pvu_nft_informations WHERE pvu_plant_id = :plant_id_number;",
            {
                type: QueryTypes.SELECT,
                plain: true,
                replacements: {plant_id_number: plantIdNumber},
                raw: true
            }
        );
}

const contractReadAuction = new web3.eth.Contract(abiReadAuction, addressReadAuction)
const getPlantId = async function (tokenId, price) {
    contractReadAuction.methods.getPlant(tokenId).call().then(data => {
        getPlantInformations(data.plantId, price, tokenId)
    })
}

const getPlantInformations = async function (plantId, price, tokenId) {
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
    }

    informations = await analyzeNFT(informations)

    buyNFT(informations)

    // if (informations.buy === true) {
    //     buyNFT(informations)
    // }

    // savePvuDataInformation(informations)
}

async function buyNFT(informations) {
    let lastBlock = await web3.eth.getBlock("latest")
    let gasLimit = lastBlock.gasLimit
    let gasUsed = lastBlock.gasUsed

    contractBid.methods.bid(informations.pvu_token_id, informations.price).send({from: web3.eth.defaultAccount, gas: gasUsed, gasLimit: gasLimit})
        .then(function (result) {
            console.log('result', result)
        }).catch(function (err) {
        console.log('error', err)
    });
}


async function getBasePriceByElement(element) {
    return await sequelize
        .query("SELECT * FROM pvu_element_prices WHERE element = :element;",
            {
                type: QueryTypes.SELECT,
                plain: true,
                replacements: {element: element},
                raw: true
            }
        );
}


async function analyzeNFT(informations) {
    let basePriceInformation = await getBasePriceByElement(informations.plant_type)
    let basePrice = basePriceInformation ? basePriceInformation.price : 20

    if (informations.status == 1 && informations.pvu_price <= basePrice && informations.pvu_le_hour_price <= 8
        && informations.hour <= 168 && informations.rent >= 0.15 && informations.plant_type == 'DARK'
    ) {
        informations.discord_alert = 1
        informations.buy = true
    }

    if (informations.status == 1 && informations.pvu_price <= basePrice && informations.pvu_le_hour_price <= 8
        && informations.hour <= 168 && informations.rent >= 0.15 && informations.plant_type == 'LIGHT'
    ) {
        informations.discord_alert = 1
        informations.buy = true
    }

    if (informations.status == 1 && informations.pvu_price <= basePrice && informations.pvu_le_hour_price <= 8
        && informations.hour <= 168 && informations.rent >= 0.15 && informations.plant_type == 'FIRE'
    ) {
        informations.discord_alert = 1
        informations.buy = true
    }

    if (informations.status == 1 && informations.pvu_price <= basePrice && informations.pvu_le_hour_price <= 8
        && informations.hour <= 168 && informations.rent >= 0.15 && informations.plant_type == 'WATER'
    ) {
        informations.discord_alert = 1
        informations.buy = true
    }

    if (informations.status == 1 && informations.pvu_price <= basePrice && informations.pvu_le_hour_price <= 8
        && informations.hour <= 168 && informations.rent >= 0.15 && informations.plant_type == 'ICE'
    ) {
        informations.discord_alert = 1
        informations.buy = true
    }

    if (informations.status == 1 && informations.pvu_price <= basePrice && informations.pvu_le_hour_price <= 8
        && informations.hour <= 168 && informations.rent >= 0.15 && informations.plant_type == 'ELETRIC'
    ) {
        informations.discord_alert = 1
        informations.buy = true
    }

    if (informations.status == 1 && informations.pvu_price <= basePrice && informations.pvu_le_hour_price <= 8
        && informations.hour <= 168 && informations.rent >= 0.15 && informations.plant_type == 'METAL'
    ) {
        informations.discord_alert = 1
        informations.buy = true
    }

    if (informations.status == 1 && informations.pvu_price <= basePrice && informations.pvu_le_hour_price <= 8
        && informations.hour <= 168 && informations.rent >= 0.15 && informations.plant_type == 'WIND'
    ) {
        informations.discord_alert = 1
        informations.buy = true
    }

    if (informations.status == 1 && informations.pvu_price <= basePrice && informations.pvu_le_hour_price <= 8
        && informations.hour <= 168 && informations.rent >= 0.15 && informations.plant_type == 'PARASITE'
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
        content: webhook.free_trial ? ":warning: Get higher ROI notifications for only 1 PVU/week, check out our #:bookmark:-plans" : '',
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
    return os.EOL + ":warning: Get higher ROI notifications for only 1 PVU/week, check out our #:bookmark:-plans"
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