require('dotenv').config()

const axios = require('axios')
const Web3 = require('web3')
const abiDecoder = require('abi-decoder');
const abi = require("./abi.json");
abiDecoder.addABI(abi);
const web3 = new Web3('https://bsc-dataseed1.binance.org:443');
const address = "0x5ab19e7091dd208f352f8e727b6dcc6f8abb6275";

require('./pvu');


axios.get('https://api.bscscan.com/api?module=account&action=txlist&address=' + address + '&page=1&offset=1&sort=desc&apikey=5A6GCUVXRGAMN7ZBBWKYUWUA2HXMEUYSPW')
    .then(async data => {
        for (const element of data.data.result) {
            const decodedData = abiDecoder.decodeMethod(element.input);
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
                continue;
            }
            pvuData = await getPvuData(tokenID)

            console.log(pvuData)
        }
    })
    .catch(error => {
        console.error(error)
    })

async function getPvuData(tokenId) {
    var d = new Date();
    d.setDate(d.getDate() - 3);

    var dd = d.getDate()
    if (dd < 10) {
        dd = '0' + dd;
    }
    var mm = d.getMonth()
    if (mm < 10) {
        mm = '0' + mm;
    }

    return await Pvu.findOne({
        where: {
            pvu_token_id: "1002112609",
            created_at: {
                $gte: d.getFullYear() + '-' + mm + '-' + dd + ' 00:00:00'
            }
        }
    })
}


const contractAbi = new web3.eth.Contract(abi, address)
const getPlantId = function (tokenId, price) {
    contractAbi.methods.getPlant(tokenId).call().then(data => {
        getPlantInformations(data.plantId, price, tokenId)
    })
}

const getPlantInformations = function (plantId, price, tokenId) {

}

