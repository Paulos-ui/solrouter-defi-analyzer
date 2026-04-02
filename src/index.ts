import 'dotenv/config';
import { createInterface } from 'readline/promises';
import ora from 'ora';
import chalk from 'chalk';
import { scanWallet } from './walletScanner.js';
import { runEncryptedAnalysis, checkSolRouterBalance } from './encryptedAnalysis.js';
import { printReport, printPrivacyComparison } from './reportRenderer.js';

// ─── Config validation ────────────────────────────────────────────────────────

function getConfig() {
  const apiKey = process.env.SOLROUTER_API_KEY;
  const rpcUrl = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
  const model  = process.env.SOLROUTER_MODEL  ?? 'gpt-oss-20b';

  if (!apiKey || apiKey === 'sk_solrouter_your_key_here') {
    console.error(chalk.red('\n  ✖  Missing SOLROUTER_API_KEY in .env file'));
    console.error(chalk.gray('     Copy .env.example → .env and add your key from solrouter.com\n'));
    process.exit(1);
  }

  return { apiKey, rpcUrl, model };
}

// ─── Banner ───────────────────────────────────────────────────────────────────

function printBanner() {
  console.clear();
  console.log(chalk.cyan('\n  ╔══════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('  ║  ') + chalk.bold.white('SolRouter Private DeFi Portfolio Analyzer') + chalk.cyan('         ║'));
  console.log(chalk.cyan('  ║  ') + chalk.gray('Encrypted AI inference · Zero plaintext exposure') + chalk.cyan('    ║'));
  console.log(chalk.cyan('  ║  ') + chalk.gray('Powered by SolRouter × Arcium × AWS Nitro Enclaves') + chalk.cyan('  ║'));
  console.log(chalk.cyan('  ╚══════════════════════════════════════════════════════╝\n'));
}

// ─── Wallet prompt ────────────────────────────────────────────────────────────

async function getTargetWallet(): Promise<string> {
  const envWallet = process.env.TARGET_WALLET;
  if (envWallet && envWallet.length > 30) return envWallet;

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    chalk.yellow('  Enter Solana wallet address to analyze: ')
  );
  rl.close();

  const wallet = answer.trim();
  if (!wallet || wallet.length < 32) {
    console.error(chalk.red('\n  ✖  Invalid wallet address\n'));
    process.exit(1);
  }
  return wallet;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  printBanner();
  printPrivacyComparison();

  const { apiKey, rpcUrl, model } = getConfig();

  // Step 0 — Check SolRouter balance
  const balanceSpinner = ora({
    text: 'Checking SolRouter USDC balance...',
    color: 'cyan',
  }).start();

  try {
    const balance = await checkSolRouterBalance(apiKey);
    balanceSpinner.succeed(`SolRouter balance: ${chalk.green(balance)}`);
  } catch (err) {
    balanceSpinner.warn('Could not fetch balance — continuing anyway');
  }

  // Step 1 — Get wallet
  const targetWallet = await getTargetWallet();

  // Step 2 — Scan wallet on-chain
  const scanSpinner = ora({
    text: `Scanning wallet on Solana ${rpcUrl.includes('devnet') ? '(devnet)' : '(mainnet)'}...`,
    color: 'yellow',
  }).start();

  let snapshot;
  try {
    snapshot = await scanWallet(targetWallet, rpcUrl);
    scanSpinner.succeed(
      `Wallet scanned — ${chalk.white(snapshot.totalTokens)} token positions, ${chalk.white(snapshot.solBalance.toFixed(4))} SOL`
    );
  } catch (err: any) {
    scanSpinner.fail(`Wallet scan failed: ${err.message}`);
    process.exit(1);
  }

  // Step 3 — Run encrypted AI analysis via SolRouter
  const analysisSpinner = ora({
    text: `Sending encrypted query to SolRouter (model: ${model})...`,
    color: 'magenta',
  }).start();

  console.log(chalk.gray('\n  🔐 Encrypting prompt via Arcium RescueCipher before transmission...'));
  console.log(chalk.gray('  📡 Routing to AWS Nitro Enclave for confidential inference...'));

  let result;
  try {
    result = await runEncryptedAnalysis(snapshot, apiKey, model);
    analysisSpinner.succeed(
      `Encrypted analysis complete — cost: ${chalk.yellow(result.cost + ' USDC')}`
    );
  } catch (err: any) {
    analysisSpinner.fail(`Analysis failed: ${err.message}`);
    console.error(chalk.gray('\n  Make sure your API key is valid and USDC balance is sufficient'));
    process.exit(1);
  }

  // Step 4 — Print full report
  printReport(snapshot, result);
}

main().catch(err => {
  console.error(chalk.red('\n  Unexpected error:'), err.message);
  process.exit(1);
});
