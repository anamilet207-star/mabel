// utils/currency.js
const USD_TO_DOP = 59; // Ejemplo: 1 USD = 59 RD$

function usdToDop(priceUsd) {
    return Math.round(priceUsd * USD_TO_DOP);
}

function formatDop(amount) {
    return `RD$ ${amount.toLocaleString('es-DO')}`;
}

module.exports = { usdToDop, formatDop };
