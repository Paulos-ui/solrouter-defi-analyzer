import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TokenPosition {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  uiBalance: string;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  isVerified: boolean;
  riskFlags: string[];
}

export interface WalletSnapshot {
  address: string;
  solBalance: number;
  solBalanceUSD: number;
  tokenPositions: TokenPosition[];
  totalTokens: number;
  scanTimestamp: string;
  network: string;
}

// ─── Known token metadata (devnet approximations) ─────────────────────────────

const KNOWN_TOKENS: Record<string, { symbol: string; name: string; verified: boolean }> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { symbol: 'USDC',   name: 'USD Coin',         verified: true  },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: { symbol: 'USDT',   name: 'Tether USD',        verified: true  },
  So11111111111111111111111111111111111111112:   { symbol: 'wSOL',   name: 'Wrapped SOL',       verified: true  },
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: { symbol: 'mSOL',   name: 'Marinade Staked SOL',verified: true  },
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj': { symbol: 'stSOL', name: 'Lido Staked SOL',  verified: true  },
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: { symbol: 'BONK',   name: 'Bonk',              verified: true  },
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: { symbol: 'JUP',    name: 'Jupiter',            verified: true  },
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': { symbol: 'RAY',  name: 'Raydium',            verified: true  },
};

// ─── Risk flag logic ───────────────────────────────────────────────────────────

function assessTokenRisk(
  mint: string,
  mintAuthority: string | null,
  freezeAuthority: string | null,
  balance: number,
  decimals: number,
  isVerified: boolean
): string[] {
  const flags: string[] = [];

  if (!isVerified) {
    flags.push('UNVERIFIED_TOKEN');
  }
  if (mintAuthority !== null) {
    flags.push('MINT_AUTHORITY_ACTIVE — supply can be inflated');
  }
  if (freezeAuthority !== null) {
    flags.push('FREEZE_AUTHORITY_ACTIVE — funds can be frozen');
  }
  if (balance > 0 && balance < 0.001 && decimals >= 6) {
    flags.push('DUST_AMOUNT — possible airdrop scam token');
  }

  return flags;
}

// ─── Main scanner ──────────────────────────────────────────────────────────────

export async function scanWallet(
  walletAddress: string,
  rpcUrl: string
): Promise<WalletSnapshot> {
  const connection = new Connection(rpcUrl, 'confirmed');
  const pubkey = new PublicKey(walletAddress);

  // Fetch SOL balance
  const lamports = await connection.getBalance(pubkey);
  const solBalance = lamports / LAMPORTS_PER_SOL;

  // Fetch all SPL token accounts
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
    programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  });

  const tokenPositions: TokenPosition[] = [];

  for (const { account } of tokenAccounts.value) {
    const parsed = account.data.parsed?.info;
    if (!parsed) continue;

    const mint: string = parsed.mint;
    const decimals: number = parsed.tokenAmount?.decimals ?? 0;
    const rawBalance: number = parsed.tokenAmount?.uiAmount ?? 0;

    if (rawBalance === 0) continue; // skip zero-balance accounts

    const known = KNOWN_TOKENS[mint];
    const isVerified = !!known;
    const symbol = known?.symbol ?? 'UNKNOWN';
    const name = known?.name ?? `Token ${mint.slice(0, 8)}...`;

    // Fetch mint info for authority checks
    let mintAuthority: string | null = null;
    let freezeAuthority: string | null = null;

    try {
      const mintInfo = await connection.getParsedAccountInfo(new PublicKey(mint));
      const mintData = (mintInfo.value?.data as any)?.parsed?.info;
      mintAuthority = mintData?.mintAuthority ?? null;
      freezeAuthority = mintData?.freezeAuthority ?? null;
    } catch {
      // Non-critical — skip if mint info unavailable
    }

    const riskFlags = assessTokenRisk(
      mint,
      mintAuthority,
      freezeAuthority,
      rawBalance,
      decimals,
      isVerified
    );

    tokenPositions.push({
      mint,
      symbol,
      name,
      balance: rawBalance,
      decimals,
      uiBalance: rawBalance.toLocaleString('en-US', { maximumFractionDigits: 6 }),
      mintAuthority,
      freezeAuthority,
      isVerified,
      riskFlags,
    });
  }

  return {
    address: walletAddress,
    solBalance,
    solBalanceUSD: solBalance * 150, // approximate devnet price proxy
    tokenPositions,
    totalTokens: tokenPositions.length,
    scanTimestamp: new Date().toISOString(),
    network: rpcUrl.includes('devnet') ? 'devnet' : 'mainnet-beta',
  };
}
