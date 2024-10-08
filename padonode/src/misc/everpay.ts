import Everpay from 'everpay'
import Arweave from 'arweave';
import { newEverpayByEcc, newEverpayByRSA } from 'arseeding-js/cjs/payOrder';
import { readFileSync } from "node:fs";
import { getPrivateKey } from '../utils';
import "../proxy.js";
const readlineSync = require('readline-sync');

/**
 * 
 * @param account 
 * @param symbol 
 * @returns 
 */
export async function everPayBalance(account: string, symbol?: string): Promise<any[]> {
  // console.log(`Get the asset balance on everPay. account: ${account} symbol: ${symbol ? symbol : "ALL"}.`);

  const everpay = new Everpay();
  if (symbol == undefined || symbol === "") {
    const balanceParams = { account: account };
    await everpay.balances(balanceParams).then(console.log);
    return [];
  }

  const info = await everpay.info();
  // console.log('info\n', info);

  let results = []
  for (let token of info.tokenList) {
    if (token.symbol === symbol) {
      const balanceParams = {
        tag: token.tag,
        account: account
      };
      const everpay = new Everpay();
      const balance = await everpay.balance(balanceParams);
      const result = {
        chain: token.chainType,
        symbol: token.symbol,
        balance: balance,
      };
      results.push(result);
    }
  }

  if (results.length === 0) {
    console.log("Chose one of the following token symbol:");
    for (let token of info.tokenList) {
      console.log(`  chain: ${token.chainType} symbol: ${token.symbol}`);
    }
  } else {
    // console.log('results:', results);
  }
  return results;
}


/**
 * Now, only supported ethereum and arweave
 * @param chain 
 * @returns 
 */
function isSupportedChain(chain: string): boolean {
  return chain === "ethereum" || chain === "arweave,ethereum";
}


async function getEverPayEthereum(walletpath: string, password: string): Promise<Everpay> {
  const ecdsaPrivateKey = await getPrivateKey(walletpath, password);
  const pay = newEverpayByEcc(ecdsaPrivateKey);
  return pay;
}

async function getEverPayArweave(walletpath: string): Promise<Everpay> {
  const wallet = JSON.parse(readFileSync(walletpath).toString());
  const address = await Arweave.init({}).wallets.jwkToAddress(wallet);
  const pay = newEverpayByRSA(wallet, address);
  return pay;
}

/**
 * 
 * @param chainType 
 * @param symbol 
 * @param amount 
 * @param walletpath 
 * @returns 
 */
export async function everPayDeposit(chainType: string, symbol: string, amount: string, walletpath: string) {
  if (chainType == "arweave") chainType = "arweave,ethereum";
  console.log(`Deposit to the everPay. chainType: ${chainType} symbol: ${symbol} amount: ${amount} walletpath: ${walletpath}.`);
  let tag = "";
  {
    // check chainType and symbol is valid
    const everpay = new Everpay();
    const info = await everpay.info();
    let is_valid = false;
    for (let token of info.tokenList) {
      if (!isSupportedChain(token.chainType)) continue;
      if (token.chainType === chainType && token.symbol === symbol) {
        is_valid = true;
        tag = token.tag;
        break;
      }
    }

    if (!is_valid) {
      console.log("Chose one of the following chain and symbol:");
      for (let token of info.tokenList) {
        if (!isSupportedChain(token.chainType)) continue;
        console.log(`  chain: ${token.chainType} symbol: ${token.symbol}`);
      }
      return;
    }
  }

  let everpay: Everpay;
  if (chainType === "ethereum") {
    var password = readlineSync.question('ENTER YOUR WALLET PASSWORD: ', {
      hideEchoBack: true
    });
    everpay = await getEverPayEthereum(walletpath, password);
  } else if (chainType === "arweave,ethereum") {
    everpay = await getEverPayArweave(walletpath);
  } else {
    console.log("only supported chainTypes: ethereum,arweave");
    return;
  }

  const tx = await everpay.deposit({
    tag: tag,
    amount: amount,
  });
  console.log('tx', tx);
}
