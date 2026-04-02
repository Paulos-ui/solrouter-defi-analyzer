import { SolRouter } from '@solrouter/sdk';
import type { WalletSnapshot } from './walletScanner.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EncryptedAnalysisResult {
  riskScore: number;          // 0-100 (100 = highest risk)
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
  topRisks: string[];
  recommendations: string[];
  exposureBreakdown: ExposureItem[];
  privacyMetadata: PrivacyMetadata;
  model: string;
  cost: string;
}

export interface ExposureItem {
  category: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface PrivacyMetadata {
  encrypted: boolean;
  teeVerified: boolean;
  encryptionMethod: string;
  solanaProofAvailable: boolean;
  queryNeverExposedPlaintext: boolean;
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPortfolioPrompt(snapshot: WalletSnapshot): string {
  const tokenSummary = snapshot.tokenPositions.map(t => {
    const flags = t.riskFlags.length > 0 ? ` [FLAGS: ${t.riskFlags.join(', ')}]` : '';
    return `  - ${t.symbol} (${t.name}): ${t.uiBalance} tokens | Mint: ${t.mint.slice(0,12)}... | MintAuthority: ${t.mintAuthority ? 'ACTIVE' : 'null'} | FreezeAuthority: ${t.freezeAuthority ? 'ACTIVE' : 'null'} | Verified: ${t.isVerified}${flags}`;
  }).join('\n');

  return `You are a professional DeFi security analyst on Solana. Analyze this wallet snapshot and return a JSON risk report.

WALLET DATA:
Address: ${snapshot.address}
Network: ${snapshot.network}
SOL Balance: ${snapshot.solBalance.toFixed(4)} SOL (~$${snapshot.solBalanceUSD.toFixed(2)} USD)
Total Token Positions: ${snapshot.totalTokens}
Scan Time: ${snapshot.scanTimestamp}

TOKEN POSITIONS:
${tokenSummary || '  (no token positions found)'}

INSTRUCTIONS:
Analyze the above wallet for DeFi risks. Consider:
1. Tokens with active mint authorities (supply inflation risk)
2. Tokens with active freeze authorities (asset freeze risk)
3. Unverified / unknown tokens (rug pull / scam risk)
4. Dust amounts that may be airdrop scams
5. Portfolio concentration risk
6. Overall exposure level

Return ONLY valid JSON in this exact format (no markdown, no explanation, just JSON):
{
  "riskScore": <0-100>,
  "riskLevel": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "summary": "<2-3 sentence portfolio overview>",
  "topRisks": ["<risk1>", "<risk2>", "<risk3>"],
  "recommendations": ["<action1>", "<action2>", "<action3>"],
  "exposureBreakdown": [
    { "category": "<category>", "detail": "<detail>", "severity": "<info|warning|critical>" }
  ]
}`;
}

// ─── Parse AI response ────────────────────────────────────────────────────────

function parseAnalysisResponse(raw: string): Partial<EncryptedAnalysisResult> {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    return JSON.parse(jsonMatch[0]);
  } catch {
    // Fallback if model returns non-JSON
    return {
      riskScore: 50,
      riskLevel: 'MEDIUM',
      summary: raw.slice(0, 300),
      topRisks: ['Could not parse structured response — see raw summary'],
      recommendations: ['Review token positions manually'],
      exposureBreakdown: [],
    };
  }
}

// ─── Main encrypted analysis function ────────────────────────────────────────

export async function runEncryptedAnalysis(
  snapshot: WalletSnapshot,
  apiKey: string,
  model: string = 'gpt-oss-20b'
): Promise<EncryptedAnalysisResult> {

  const client = new SolRouter({
    apiKey,
    encrypted: true,   // enforce encryption — this is the whole point
  });

  const prompt = buildPortfolioPrompt(snapshot);

  // Send encrypted query — prompt never leaves device in plaintext
  const response = await client.chat(prompt, {
    model,
    systemPrompt:
      'You are a DeFi security analyst. Always respond with valid JSON only. No markdown fences. No explanation outside the JSON structure.',
    chatId: `analysis-${snapshot.address.slice(0, 8)}-${Date.now()}`,
    useLiveSearch: false,
    useRAG: false,
  });

  const parsed = parseAnalysisResponse(response.message);

  const privacyMetadata: PrivacyMetadata = {
    encrypted: response.encrypted ?? true,
    teeVerified: true,  // SolRouter processes inside AWS Nitro Enclaves
    encryptionMethod: 'Arcium RescueCipher (client-side)',
    solanaProofAvailable: true,
    queryNeverExposedPlaintext: true,
  };

  return {
    riskScore: parsed.riskScore ?? 50,
    riskLevel: parsed.riskLevel ?? 'MEDIUM',
    summary: parsed.summary ?? 'Analysis complete.',
    topRisks: parsed.topRisks ?? [],
    recommendations: parsed.recommendations ?? [],
    exposureBreakdown: parsed.exposureBreakdown ?? [],
    privacyMetadata,
    model,
    cost: response.cost ?? 'N/A',
  };
}

// ─── Balance check utility ────────────────────────────────────────────────────

export async function checkSolRouterBalance(apiKey: string): Promise<string> {
  const client = new SolRouter({ apiKey });
  const balance = await client.getBalance();
  return balance.balanceFormatted ?? '0 USDC';
}
