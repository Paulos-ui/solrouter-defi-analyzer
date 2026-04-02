import chalk from 'chalk';
import type { EncryptedAnalysisResult } from './encryptedAnalysis.js';
import type { WalletSnapshot } from './walletScanner.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function riskColor(level: string): chalk.Chalk {
  switch (level) {
    case 'LOW':      return chalk.green;
    case 'MEDIUM':   return chalk.yellow;
    case 'HIGH':     return chalk.red;
    case 'CRITICAL': return chalk.bgRed.white;
    default:         return chalk.white;
  }
}

function severityIcon(severity: string): string {
  switch (severity) {
    case 'info':     return chalk.blue('ℹ');
    case 'warning':  return chalk.yellow('⚠');
    case 'critical': return chalk.red('✖');
    default:         return '·';
  }
}

function scoreBar(score: number): string {
  const filled = Math.round(score / 5);
  const empty = 20 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const color = score < 30 ? chalk.green : score < 60 ? chalk.yellow : chalk.red;
  return color(bar);
}

// ─── Privacy proof block ──────────────────────────────────────────────────────

export function printPrivacyProof(result: EncryptedAnalysisResult): void {
  console.log('\n' + chalk.cyan('┌─────────────────────────────────────────────────────┐'));
  console.log(chalk.cyan('│') + chalk.bold.cyan('           🔐  PRIVACY VERIFICATION PROOF            ') + chalk.cyan('│'));
  console.log(chalk.cyan('├─────────────────────────────────────────────────────┤'));
  console.log(chalk.cyan('│') + ` Encryption method : ${chalk.green(result.privacyMetadata.encryptionMethod.padEnd(31))}` + chalk.cyan('│'));
  console.log(chalk.cyan('│') + ` TEE environment   : ${chalk.green('AWS Nitro Enclave (hardware isolated)'.padEnd(31))}` + chalk.cyan('│'));
  console.log(chalk.cyan('│') + ` Query encrypted   : ${chalk.green((result.privacyMetadata.queryNeverExposedPlaintext ? 'YES — never sent as plaintext' : 'NO').padEnd(31))}` + chalk.cyan('│'));
  console.log(chalk.cyan('│') + ` Solana proof      : ${chalk.green((result.privacyMetadata.solanaProofAvailable ? 'POSTED on-chain (verifiable)' : 'N/A').padEnd(31))}` + chalk.cyan('│'));
  console.log(chalk.cyan('│') + ` Inference cost    : ${chalk.yellow((result.cost + ' USDC devnet').padEnd(31))}` + chalk.cyan('│'));
  console.log(chalk.cyan('│') + ` Model used        : ${chalk.white((result.model).padEnd(31))}` + chalk.cyan('│'));
  console.log(chalk.cyan('└─────────────────────────────────────────────────────┘'));
}

// ─── Main report printer ──────────────────────────────────────────────────────

export function printReport(
  snapshot: WalletSnapshot,
  result: EncryptedAnalysisResult
): void {
  const divider = chalk.gray('─'.repeat(57));

  console.log('\n\n');
  console.log(chalk.bold.white('╔═════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.white('║') + chalk.bold.cyan('     SOLROUTER PRIVATE DEFI PORTFOLIO ANALYZER       ') + chalk.bold.white('║'));
  console.log(chalk.bold.white('╚═════════════════════════════════════════════════════╝'));

  // Wallet overview
  console.log('\n' + chalk.bold('  📍 WALLET OVERVIEW'));
  console.log(divider);
  console.log(`  Address  : ${chalk.yellow(snapshot.address)}`);
  console.log(`  Network  : ${chalk.cyan(snapshot.network)}`);
  console.log(`  SOL      : ${chalk.white(snapshot.solBalance.toFixed(4))} SOL`);
  console.log(`  Tokens   : ${chalk.white(snapshot.totalTokens)} positions found`);
  console.log(`  Scanned  : ${chalk.gray(snapshot.scanTimestamp)}`);

  // Risk score
  console.log('\n' + chalk.bold('  🎯 RISK SCORE'));
  console.log(divider);
  const colorFn = riskColor(result.riskLevel);
  console.log(`  ${scoreBar(result.riskScore)} ${colorFn.bold(result.riskScore + '/100')}  ${colorFn.bold('[' + result.riskLevel + ']')}`);
  console.log('\n  ' + chalk.italic(result.summary));

  // Top risks
  if (result.topRisks.length > 0) {
    console.log('\n' + chalk.bold('  ⚠  TOP RISKS IDENTIFIED'));
    console.log(divider);
    result.topRisks.forEach((risk, i) => {
      console.log(`  ${chalk.red(String(i + 1) + '.')} ${risk}`);
    });
  }

  // Exposure breakdown
  if (result.exposureBreakdown.length > 0) {
    console.log('\n' + chalk.bold('  📊 EXPOSURE BREAKDOWN'));
    console.log(divider);
    result.exposureBreakdown.forEach(item => {
      console.log(`  ${severityIcon(item.severity)}  ${chalk.bold(item.category)}: ${item.detail}`);
    });
  }

  // Token positions detail
  if (snapshot.tokenPositions.length > 0) {
    console.log('\n' + chalk.bold('  💰 TOKEN POSITIONS'));
    console.log(divider);
    snapshot.tokenPositions.forEach(token => {
      const verified = token.isVerified ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${verified} ${chalk.bold(token.symbol.padEnd(8))} ${chalk.white(token.uiBalance.padStart(16))} | ${chalk.gray(token.mint.slice(0, 16) + '...')}`);
      token.riskFlags.forEach(flag => {
        console.log(`       ${chalk.red('↳')} ${chalk.yellow(flag)}`);
      });
    });
  }

  // Recommendations
  if (result.recommendations.length > 0) {
    console.log('\n' + chalk.bold('  ✅ RECOMMENDATIONS'));
    console.log(divider);
    result.recommendations.forEach((rec, i) => {
      console.log(`  ${chalk.green(String(i + 1) + '.')} ${rec}`);
    });
  }

  // Privacy proof
  printPrivacyProof(result);

  // Footer
  console.log('\n' + chalk.gray('  Built with SolRouter — encrypted AI inference on Solana'));
  console.log(chalk.gray('  Prompts encrypted via Arcium RescueCipher · Processed in AWS Nitro Enclaves'));
  console.log(chalk.gray('  Privacy proofs posted on Solana blockchain · Zero plaintext exposure\n'));
}

// ─── Before/after comparison printer ─────────────────────────────────────────

export function printPrivacyComparison(): void {
  console.log('\n' + chalk.bold.white('  🔍 WHY PRIVATE INFERENCE MATTERS FOR PORTFOLIO ANALYSIS'));
  console.log(chalk.gray('─'.repeat(57)));
  console.log();
  console.log(chalk.bold('  WITHOUT SolRouter (standard AI API):'));
  console.log(chalk.red('  ✗') + ' Your wallet address sent in plaintext to AI provider');
  console.log(chalk.red('  ✗') + ' Holdings logged in provider request history');
  console.log(chalk.red('  ✗') + ' Portfolio data stored on third-party servers');
  console.log(chalk.red('  ✗') + ' MEV bots / competitors can infer your strategy');
  console.log(chalk.red('  ✗') + ' No cryptographic proof query was private');
  console.log();
  console.log(chalk.bold('  WITH SolRouter (encrypted inference):'));
  console.log(chalk.green('  ✓') + ' Prompt encrypted on YOUR device before sending');
  console.log(chalk.green('  ✓') + ' Processed inside AWS Nitro Enclaves — no one can read it');
  console.log(chalk.green('  ✓') + ' Zero data retention — query deleted after execution');
  console.log(chalk.green('  ✓') + ' Verifiable proof posted on Solana — cryptographically auditable');
  console.log(chalk.green('  ✓') + ' Paid with USDC micropayments — no identity attached');
  console.log();
}
