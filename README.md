# cashier-coinbase

Simplified Coinbase API manager package.

## Usage

Install the package by typing `npm i @bitsoft-network/cashier-coinbase` in your project folder.

### Setup

###### Example:

```javascript
const CoinbaseCashier = require("@bitsoft-network/cashier-coinbase");

const client = new CoinbaseCashier({
  apiKey: "lamekey",
  apiSecret: "lamesecret",
});
```

## Methods

### getCashierAccounts

Get cashier accounts information (BTC, ETH and LTC).

###### Example:

```javascript
const accounts = await client.getCashierAccounts();
```

#### Parameters

None

#### Returns

- Object (AccountsObject)

### createDepositAddresses

Create user's deposit addresses (BTC, ETH and LTC)

###### Example:

```javascript
const addresses = await client.createDepositAddresses(userId);
```

#### Parameters

- userId (String)

#### Returns

- Object (AddressesObject)

### createNewWithdraw

Create a new withdraw. Amount must be in cryptocurrency (max 4 decimal places). Transaction ID is to ensure every transaction is unique and only executed once.

###### Example:

```javascript
const withdraw = await client.createNewWithdraw(
  currency,
  amount,
  toAddress,
  transactionId
);
```

#### Parameters

- currency (String [ BTC | ETH | LTC ])
- amount (String)
- toAddress (String)
- transactionId (String)

#### Returns

- Object (WithdrawObject)

### getExchangeRate

Get exchange rate for two currencies. Return value will contain exchange rate for one unit of currency.

###### Example:

```javascript
const rate = await client.getExchangeRate(currency, toCurrency);
```

###### Example 2:

```javascript
const rate = await client.getExchangeRate("BTC", "EUR"); // 35409.37
```

#### Parameters

- currency (String)
- toCurrency (String)

#### Returns

- Object (RateObject)

### validateNotification

Validate incoming IPN (Instant Payment Notification).

###### Example:

```javascript
const valid = await client.validateNotification(body, signature);
```

#### Parameters

- body (ExpressJsRequest, Object)
- signature (String)

#### Returns

- Boolean

## Objects

### ConfigObject

Object which holds all configuration values.

#### Example

```javascript
const config = {
  // Coinbase API key
  apiKey: "lamekey",

  // Coinbase API secret
  apiSecret: "lamesecret",

  // API version to use. Default
  // version is: "2022-01-30"
  apiVersion: "",

  // Whether or not to show debug
  // messages
  debug: false,
};
```

### AccountsObject

Stores the Coinbase accounts used by cashier

#### Example

```javascript
{
  BTC: {
    id: "...",
    name: "BTC Wallet",
    primary: true,
    type: "wallet",
    currency: {
      code: "BTC",
      name: "Bitcoin",
      color: "#F7931A",
      sort_index: 100,
      exponent: 8,
      type: "crypto",
      address_regex: "^([13][a-km-zA-HJ-NP-Z1-9]{25,34})|^(bc1([qpzry9x8gf2tvdw0s3jn54khce6mua7l]{39}|[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{59}))$",
      asset_id: "...",
      slug: "bitcoin"
    },
    balance: { "amount": "0.00000000", "currency": "BTC" },
    created_at: "2018-08-28T00:00:00Z",
    updated_at: "2018-08-28T00:00:00Z",
    resource: "account",
    resource_path: "/v2/accounts/...",
    allow_deposits: true,
    allow_withdrawals: true
  },
  ETH: { ... },
  LTC: { ... }
}
```

### AddressesObject

Newly created addresses from Coinbase API.

#### Example

```javascript
{
  BTC: '...btcAddress',
  ETH: '...ethAddress',
  LTC: '...ltcAddress'
}
```

### WithdrawObject

Newly created withdraw from Coinbase API.

#### Example

```javascript
{
  id: "...transactionIdFromCoinbase",
  network: {
    status: "unconfirmed",
    hash: "463397c87beddd9a61ade61359a13adc9efea26062191fe07147037bce7f33ed",
    name: "bitcoin"
  }
}
```

## License

MIT <3
