// Require Dependencies
const axios = require("axios");
const crypto = require("crypto");

// Main class
class CoinbaseClient {
  // Class constructor method
  constructor({ apiKey, apiSecret, apiVersion, debug }) {
    if (!apiKey || !apiSecret)
      throw new Error(
        "[Coinbase] Missing apiKey or apiSecret parameter(s). These are required."
      );

    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.apiVersion = apiVersion || "2022-01-30";
    this.debug = debug || false;
    this.cashierWallets = {};
    this.ready = false;
    this.notificationsKey = "";

    // Setup Axios Client
    this.setupClient();
  }

  // Setup Axios client
  async setupClient() {
    if (this.debug)
      console.log("[Coinbase] setupClient() : Started client setup...");

    // Create axios instance
    this.api = axios.create({
      baseURL: "https://api.coinbase.com/v2",
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
        "CB-VERSION": this.apiVersion,
        "CB-ACCESS-KEY": this.apiKey,
      },
    });

    // Add a request interceptor
    this.api.interceptors.request.use(config => {
      const timestamp = Math.floor(Date.now() / 1000);

      // If request has body, include it in hash
      const prehash =
        timestamp +
        config.method.toUpperCase() +
        "/v2" +
        config.url +
        (config.data ? JSON.stringify(config.data) : "");

      // Set new headers
      config.headers["CB-ACCESS-TIMESTAMP"] = timestamp.toString();
      config.headers["CB-ACCESS-SIGN"] = crypto
        .createHmac("sha256", this.apiSecret)
        .update(prehash)
        .digest("hex");

      // Return modified config file
      return config;
    });

    // Add a response interceptor
    this.api.interceptors.response.use(
      response => response.data,
      error => {
        // If this was API Error
        if (error.response && error.response.data) {
          const method = error.response.request.method;
          const statusCode = error.response.status;
          const host = error.response.request.host;
          const path = error.response.request.path;

          if (this.debug) console.log("[Coinbase]", error.response.data);

          return Promise.reject(
            new Error(
              `[Coinbase] ${method} - ${host + path}, FAIL : ${statusCode}`
            )
          );
        } else {
          return Promise.reject(error);
        }
      }
    );

    try {
      if (this.debug)
        console.log(
          "[Coinbase] setupClient() : Getting account data from API..."
        );

      // Get accounts
      const accounts = await this.#getAccounts();

      // Map to get wallet objects
      const btcWallet = accounts.find(acc => acc.currency.code === "BTC");
      const ethWallet = accounts.find(acc => acc.currency.code === "ETH");
      const ltcWallet = accounts.find(acc => acc.currency.code === "LTC");

      // If some of the accounts were not found
      if (!btcWallet || !ethWallet || !ltcWallet) {
        throw new Error(
          "[Coinbase] Please enable BTC, ETH and LTC wallets from Coinbase API manager!"
        );
      }

      if (this.debug)
        console.log(
          "[Coinbase] setupClient() : Connected! BTC:",
          parseFloat(btcWallet.balance.amount),
          ",",
          "ETH:",
          parseFloat(ethWallet.balance.amount),
          ",",
          "LTC:",
          parseFloat(ltcWallet.balance.amount),
          "."
        );

      // Update variables
      this.cashierWallets = {
        BTC: btcWallet,
        ETH: ethWallet,
        LTC: ltcWallet,
      };
      this.ready = true;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Get cashier accounts (BTC, ETH and LTC)
  async getCashierAccounts() {
    // Check that package is ready
    if (!this.ready)
      throw new Error(
        "[Coinbase] getCashierAccounts() : Please wait until accounts have been loaded."
      );

    return this.cashierWallets;
  }

  // Get Coinbase accounts
  async #getAccounts() {
    return new Promise(async (resolve, reject) => {
      try {
        // Get accounts from API
        const response = await this.api.get("/accounts");

        resolve(response.data);
      } catch (error) {
        reject(new Error(error.message));
      }
    });
  }

  // Create new deposit addresses for user
  async createDepositAddresses(userId) {
    // Check that package is ready
    if (!this.ready)
      throw new Error(
        "[Coinbase] createDepositAddresses() : Please wait until accounts have been loaded."
      );
    if (this.debug)
      console.log(
        "[Coinbase] createDepositAddresses(userId) : Creating addresses for",
        userId + "..."
      );

    // Check that parameters exist
    if (!userId)
      throw new Error(
        "[Coinbase] createDepositAddresses(userId) : Missing userId parameter. This is required!"
      );

    return new Promise(async (resolve, reject) => {
      // Get id's from state
      const btcAccountId = this.cashierWallets.BTC.id;
      const ethAccountId = this.cashierWallets.ETH.id;
      const ltcAccountId = this.cashierWallets.LTC.id;

      try {
        // Make API calls to create addresses
        const btcWallet = await this.api.post(
          `/accounts/${btcAccountId}/addresses`,
          { name: userId }
        );
        const ethWallet = await this.api.post(
          `/accounts/${ethAccountId}/addresses`,
          { name: userId }
        );
        const ltcWallet = await this.api.post(
          `/accounts/${ltcAccountId}/addresses`,
          { name: userId }
        );

        if (this.debug)
          console.log(
            "[Coinbase] createDepositAddresses(userId) : Created addresses for",
            userId + "!"
          );

        // Return wallet addresses
        resolve({
          BTC: btcWallet.data.address,
          ETH: ethWallet.data.address,
          LTC: ltcWallet.data.address,
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Create a new withdraw
  async createNewWithdraw(currency, amount, toAddress, transactionId) {
    // Check that package is ready
    if (!this.ready)
      throw new Error(
        "[Coinbase] createNewWithdraw(currency, amount, toAddress, transactionId) : Please wait until accounts have been loaded."
      );

    // Check that parameters exist
    if (!currency || !amount || !toAddress || !transactionId)
      throw new Error(
        "[Coinbase] createNewWithdraw(currency, amount, toAddress, transactionId) : Missing currency, amount, toAddress or wallet parameter(s). These are required!"
      );

    // Check that currency parameter is valid
    if (!["BTC", "ETH", "LTC"].includes(currency))
      throw new Error(
        "[Coinbase] createNewWithdraw(currency, amount, toAddress, transactionId) : currency parameter must be one of ['BTC', 'ETH', 'LTC']."
      );

    if (this.debug)
      console.log(
        "[Coinbase] createNewWithdraw(currency, amount, toAddress, transactionId) : Creating withdraw for transaction:",
        transactionId + "."
      );

    return new Promise(async (resolve, reject) => {
      // Get id from state
      const accountId = this.cashierWallets[currency].id;

      // Setup request options
      const options = {
        // Type is required
        type: "send",

        // A bitcoin address, bitcoin cash address, litecoin address, ethereum
        // address, or an email of the recipient
        to: toAddress,

        // Amount to be sent (in cryptocurrency)
        amount,

        // Currency for the amount
        currency,

        // A token to ensure idempotence. If a previous transaction with the
        // same idem parameter already exists for this sender, that previous
        // transaction will be returned and a new one will not be created.
        // Max length 100 characters
        idem: transactionId,
      };

      try {
        // Make API call to create withdraw
        const response = await this.api.post(
          `/accounts/${accountId}/transactions`,
          options
        );

        if (this.debug)
          console.log(
            "[Coinbase] createNewWithdraw(currency, amount, toAddress, transactionId) : Created withdraw valued",
            amount,
            currency,
            "to",
            toAddress + "."
          );

        // Return wallet addresses
        resolve({
          id: response.data.id,
          network: response.data.network,
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Get exchange rate for currency
  async getExchangeRate(currency, toCurrency) {
    // Check that parameters exist
    if (!currency || !toCurrency)
      throw new Error(
        "[Coinbase] getExchangeRate(currency, toCurrency) : Missing currency or toCurrency parameter(s). These are required!"
      );

    if (this.debug)
      console.log(
        "[Coinbase] getExchangeRate(currency, toCurrency) : Getting exchange rate from",
        currency,
        "to",
        toCurrency + "..."
      );

    return new Promise(async (resolve, reject) => {
      try {
        // Make API call to get exchange rate
        const response = await this.api.get(
          `/prices/${currency}-${toCurrency}/spot`
        );

        // Get 1 unit amount from response
        const amount = parseFloat(response.data.amount);

        if (this.debug)
          console.log(
            "[Coinbase] getExchangeRate(currency, toCurrency) : Got exchange rate:",
            1,
            currency,
            "=",
            amount,
            toCurrency
          );

        // Resolve exchange rate for currency
        resolve(amount);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Validate Coinbase notification
  async validateNotification(body, signature) {
    return new Promise(resolve => {
      // Verify signature
      const verified = crypto
        .createVerify("RSA-SHA256")
        .update(body)
        .verify(this.notificationsKey, signature, "base64");

      // Whether signature matches
      if (verified) {
        // Process notification
        resolve(true);
      } else {
        // Decline notification
        resolve(false);
      }
    });
  }
}

// Export class
module.exports = CoinbaseClient;
