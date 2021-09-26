require('dotenv').config()

const os = require("os");
const Web3 = require("web3");

const web3 = new Web3('wss://bsc.getblock.io/mainnet/?api_key=4a86ff72-bb5b-403f-a077-9548a88b2b20');
const abiDecoder = require('abi-decoder');
const abi = require("./abi.json");
abiDecoder.addABI(abi);
const address = '0x5ab19e7091dd208f352f8e727b6dcc6f8abb6275'

const {Webhook, MessageBuilder} = require('discord-webhook-node');

const sequelize = require('./sequelize');
const {QueryTypes} = require('sequelize');

const PVU_FRONT_URL = 'https://marketplace.plantvsundead.com/offering/bundle#/plant/'
const PRICE_PVU_OUT = 500
const MONTH_HOURS = 720
const BSC_URL = 'https://bscscan.com/address/0x926eae99527a9503eaDb4c9e927f21f84f20C977#writeContract'

const WEBHOOK_ROI_10_TO_25 = 'https://discord.com/api/webhooks/890627083296972830/QliSZ9WQrTMGUoYBol6RdW-H0Hr6l0kE1Ez1r2KyvnvR9v44Na_uJ-i2AXQZa-eQd7pR'
const WEBHOOK_ROI_ABOVE_40 = 'https://discord.com/api/webhooks/891442569635037195/eYxKTqbPbPmKtGR8SiLPLUmV2_GNEICywIiMWwGlgQajZEfHuoJ8TGWiybC29OQPYHW6'
const WEBHOOK_LOWEST_PRICE = 'https://discord.com/api/webhooks/891443308654645308/_s74Ljtd4F-2m9NsvbYX83Udoou9FfoDXBmtJ537SiXZyic51Qp8ZYNIPw_N3dVczPHX'
const WEBHOOK_LOWEST_PRICE_DARK = 'https://discord.com/api/webhooks/891717089704939520/dOtZLRkP0XvN-dP4MRfn7jz65GAhhVgKxS3-rG9bIYprpcW1-Brzql2GSvasrPN_s7q5'
const WEBHOOK_LOWEST_PRICE_LIGHT = 'https://discord.com/api/webhooks/891717194260578314/NBFg2dCGVf3H_-Yw1YTNWxdhw0mnthfId0ynNO8PBR4Q55VoPCs_7s04irj6I7H61-wz'
const WEBHOOK_LOWEST_PRICE_FIRE = 'https://discord.com/api/webhooks/891717307519356998/qsPO2D2-GChuKrY-fFIEK3k6DMt2DBjaWt8mohMG0QuI0CDASWZ-q513RT1jCzezOSMH'
const WEBHOOK_LOWEST_PRICE_WATER = 'https://discord.com/api/webhooks/891717408673370152/qqbiwpx5bvf3cdW64cpbCSGHCK9gW0SYRwW40ggg-He84YkzNxCXfi-IegST2wufbMhT'
const WEBHOOK_LOWEST_PRICE_ICE = 'https://discord.com/api/webhooks/891717497420660746/j9QTGC53wP90AmEwmg41vphAyuVxjPTlhPFbJLPatn3BW0WMQYMsLLQTM9obUH6OBdGl'
const WEBHOOK_LOWEST_PRICE_ELECTRIC = 'https://discord.com/api/webhooks/891717611644137553/TkATis7-rgB-CCzSj7PjayXLmCix5tBs5508ppnIzL13vzX1uftuio2QJFzG5Ecj3OaN'
const WEBHOOK_LOWEST_PRICE_METAL = 'https://discord.com/api/webhooks/891726564927086673/VD27MZmcLNbh9nrtOPcdx6oHvfo9zQTN6gutl5rf_hHv2MLNAh1olHTTWH8HhMSRQfFf'
const WEBHOOK_LOWEST_PRICE_WIND = 'https://discord.com/api/webhooks/891717770629230594/dcc2uBtrEsz7i5DQDGtOOQqMLygrYzSa3si-zD2XmyA18G-4R9SagSsLUqtkW_MlOP0m'
const WEBHOOK_LOWEST_PRICE_PARASITE = 'https://discord.com/api/webhooks/891717900547817492/ckb0wHEjoxPlGuvf-NRcWAcY8z7Rlr7aDfFo_RRpLEpjZnxTKrE1btPWWYDZ507wZKts'

const NodeCache = require( "node-cache" );
const myCache = new NodeCache();

web3.eth.subscribe('logs', {
    address: address
}, function (error, result) {
    if (!error) {
        let cache = myCache.get("transaction_" + result.transactionHash);
        if (cache == undefined) {
            myCache.set( "transaction_" + result.transactionHash, true, 10000)
            web3.eth.getTransaction(result.transactionHash)
                .then(data => {
                    if (typeof result.transactionHash !== 'undefined' && result.transactionHash !== null) {
                        processInput(data.input).then(r => {
                        }).catch(r => {
                            console.log("DEU RUIM")
                        })
                    }
                })
        }
    }
});

async function processInput(input) {
    const decodedData = abiDecoder.decodeMethod(input);

    if (typeof decodedData.params == 'undefined' && decodedData.params == null){
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

const contractAbi = new web3.eth.Contract(abi, address)
const getPlantId = async function (tokenId, price) {
    contractAbi.methods.getPlant(tokenId).call().then(data => {
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
    }

    informations = analyzeNFTAndSendDiscord(informations)

    savePvuDataInformation(informations)
}


function analyzeNFTAndSendDiscord(informations) {
    let webhook = null

    if (informations.status == 1 && informations.hour <= 96 && informations.le_hour >= 10
        && informations.pvu_le_hour_price != 99.00000000 && informations.pvu_price != 99.99999999
        && informations.rent >= 0.1 && informations.rent <= 0.25
    ) {
        informations.discord_alert = 1
        webhook = {
            webhook: WEBHOOK_ROI_10_TO_25,
            free_trial: true,
            direct_bsc: true,
            disable: false
        }
    }

    if (informations.status == 1 && informations.hour <= 96 && informations.le_hour >= 10
        && informations.pvu_le_hour_price != 99.00000000 && informations.pvu_price != 99.99999999
        && informations.rent >= 0.4 && informations.plant_type != 'LIGHT'
    ) {
        informations.discord_alert = 1
        webhook = {
            webhook: WEBHOOK_ROI_ABOVE_40,
            free_trial: false,
            direct_bsc: true,
            disable: false
        }
    }

    if (informations.status == 1 && informations.pvu_price <= 35 && informations.pvu_le_hour_price <= 8
        && informations.hour <= 168 && informations.rent >= 0.15 && informations.plant_type == 'DARK'
    ) {
        informations.discord_alert = 1
        webhook = {
            webhook: WEBHOOK_LOWEST_PRICE_DARK,
            free_trial: false,
            direct_bsc: true,
            disable: false
        }
    }

    if (informations.status == 1 && informations.pvu_price <= 35 && informations.pvu_le_hour_price <= 8
        && informations.hour <= 168 && informations.rent >= 0.15 && informations.plant_type == 'LIGHT'
    ) {
        informations.discord_alert = 1
        webhook = {
            webhook: WEBHOOK_LOWEST_PRICE_LIGHT,
            free_trial: false,
            direct_bsc: true,
            disable: false
        }
    }

    if (informations.status == 1 && informations.pvu_price <= 35 && informations.pvu_le_hour_price <= 8
        && informations.hour <= 168 && informations.rent >= 0.15 && informations.plant_type == 'FIRE'
    ) {
        informations.discord_alert = 1
        webhook = {
            webhook: WEBHOOK_LOWEST_PRICE_FIRE,
            free_trial: false,
            direct_bsc: true,
            disable: false
        }
    }

    if (informations.status == 1 && informations.pvu_price <= 35 && informations.pvu_le_hour_price <= 8
        && informations.hour <= 168 && informations.rent >= 0.15 && informations.plant_type == 'WATER'
    ) {
        informations.discord_alert = 1
        webhook = {
            webhook: WEBHOOK_LOWEST_PRICE_WATER,
            free_trial: false,
            direct_bsc: true,
            disable: false
        }
    }

    if (informations.status == 1 && informations.pvu_price <= 35 && informations.pvu_le_hour_price <= 8
        && informations.hour <= 168 && informations.rent >= 0.15 && informations.plant_type == 'ICE'
    ) {
        informations.discord_alert = 1
        webhook = {
            webhook: WEBHOOK_LOWEST_PRICE_ICE,
            free_trial: false,
            direct_bsc: true,
            disable: false
        }
    }

    if (informations.status == 1 && informations.pvu_price <= 35 && informations.pvu_le_hour_price <= 8
        && informations.hour <= 168 && informations.rent >= 0.15 && informations.plant_type == 'ELETRIC'
    ) {
        informations.discord_alert = 1
        webhook = {
            webhook: WEBHOOK_LOWEST_PRICE_ELECTRIC,
            free_trial: false,
            direct_bsc: true,
            disable: false
        }
    }

    if (informations.status == 1 && informations.pvu_price <= 35 && informations.pvu_le_hour_price <= 8
        && informations.hour <= 168 && informations.rent >= 0.15 && informations.plant_type == 'METAL'
    ) {
        informations.discord_alert = 1
        webhook = {
            webhook: WEBHOOK_LOWEST_PRICE_METAL,
            free_trial: false,
            direct_bsc: true,
            disable: false
        }
    }

    if (informations.status == 1 && informations.pvu_price <= 35 && informations.pvu_le_hour_price <= 8
        && informations.hour <= 168 && informations.rent >= 0.15 && informations.plant_type == 'WIND'
    ) {
        informations.discord_alert = 1
        webhook = {
            webhook: WEBHOOK_LOWEST_PRICE_WIND,
            free_trial: false,
            direct_bsc: true,
            disable: false
        }
    }

    if (informations.status == 1 && informations.pvu_price <= 35 && informations.pvu_le_hour_price <= 8
        && informations.hour <= 168 && informations.rent >= 0.15 && informations.plant_type == 'PARASITE'
    ) {
        informations.discord_alert = 1
        webhook = {
            webhook: WEBHOOK_LOWEST_PRICE_PARASITE,
            free_trial: false,
            direct_bsc: true,
            disable: false
        }
    }

    if (webhook) {
        sendDiscordAlert(webhook, informations)
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