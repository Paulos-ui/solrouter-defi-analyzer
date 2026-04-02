# 🔐 SolRouter Private DeFi Portfolio Analyzer

> **Encrypted AI inference for your Solana portfolio — your holdings never leave your device in plaintext.**

Built for the [SolRouter: Ship With Encrypted AI](https://solrouter.com) bounty.

---

## The Problem

Every time you ask an AI to analyze your DeFi portfolio, you're handing your entire wallet exposure to a third party:

- Your wallet address and holdings sent **in plaintext** to the AI provider
- Stored in request logs on their servers
- Accessible to provider employees, data breaches, and subpoenas
- No cryptographic proof that your query was ever private

For a trading strategy, this is catastrophic. Your positions can be front-run. Your risk profile can be inferred. **The prompt itself is the secret.**

---

## The Solution

This tool routes every portfolio analysis query through **SolRouter's encrypted inference layer**:

```
Your wallet data
      │
      ▼
[ Arcium RescueCipher — encrypted ON YOUR DEVICE ]
      │
      ▼ ← prompt is now ciphertext, never plaintext
[ SolRouter network ]
      │
      ▼
[ AWS Nitro Enclave — hardware-isolated TEE ]
   • Processes query in encrypted memory
   • Even AWS cannot read your prompt
      │
      ▼
[ Solana blockchain ]
   • Verifiable privacy proof posted on-chain
   • Micropayment settled in USDC (devnet)
      │
      ▼
[ Encrypted response → decrypted only on your device ]
```

---

## What It Does

1. **Scans any Solana wallet** — fetches all SPL token positions, SOL balance, mint/freeze authorities
2. **Builds a risk-aware prompt** — structures portfolio data for AI analysis, including on-chain risk flags
3. **Sends it through SolRouter** — prompt is encrypted before leaving your machine, processed inside a TEE
4. **Returns a full risk report** — risk score (0–100), top risks, exposure breakdown, and actionable recommendations
5. **Proves privacy** — displays the TEE attestation metadata and Solana proof reference

---

## Privacy Comparison

| | Standard AI API | **SolRouter** |
|---|---|---|
| Prompt transmission | ❌ Plaintext | ✅ Encrypted (client-side) |
| Processing environment | ❌ Shared cloud VM | ✅ AWS Nitro Enclave (TEE) |
| Data retention | ❌ Logged on server | ✅ Zero retention |
| Verifiable privacy | ❌ Trust the provider | ✅ Proof on Solana |
| Payment method | ❌ Credit card / identity | ✅ USDC micropayment |

---

## Demo

[![Demo Video](https://img.shields.io/badge/Demo-Watch%20on%20Loom-blueviolet?style=for-the-badge)](https://loom.com/your-demo-link)

**Screenshot — Terminal output:**

```
  ╔══════════════════════════════════════════════════════╗
  ║  SolRouter Private DeFi Portfolio Analyzer           ║
  ║  Encrypted AI inference · Zero plaintext exposure    ║
  ╚══════════════════════════════════════════════════════╝

  WITHOUT SolRouter (standard AI API):
  ✗ Your wallet address sent in plaintext to AI provider
  ✗ Holdings logged in provider request history
  ✗ No cryptographic proof query was private

  WITH SolRouter (encrypted inference):
  ✓ Prompt encrypted on YOUR device before sending
  ✓ Processed inside AWS Nitro Enclaves — no one can read it
  ✓ Verifiable proof posted on Solana
  ✓ Paid with USDC micropayments — no identity attached

  ✔ SolRouter balance: 14.20 USDC (devnet)
  Enter Solana wallet address to analyze: <your address>
  ✔ Wallet scanned — 4 token positions, 2.4500 SOL
  🔐 Encrypting prompt via Arcium RescueCipher...
  📡 Routing to AWS Nitro Enclave...
  ✔ Encrypted analysis complete — cost: 0.002 USDC

  🎯 RISK SCORE
  ████████░░░░░░░░░░░░  42/100  [MEDIUM]

  ⚠  TOP RISKS IDENTIFIED
  1. BONK holding has active Mint Authority — supply inflation risk
  2. 2 unverified tokens detected — possible airdrop scam tokens
  3. Portfolio 100% on devnet — no mainnet diversification

  ┌──────────────────────────────────────────────────────┐
  │           🔐  PRIVACY VERIFICATION PROOF            │
  ├──────────────────────────────────────────────────────┤
  │ Encryption method : Arcium RescueCipher (client-side)│
  │ TEE environment   : AWS Nitro Enclave                │
  │ Query encrypted   : YES — never sent as plaintext    │
  │ Solana proof      : POSTED on-chain (verifiable)     │
  └──────────────────────────────────────────────────────┘
```

---

## Setup

### Prerequisites

- Node.js 18+
- A Solana devnet wallet (e.g. [Phantom](https://phantom.app) set to devnet)
- Free devnet USDC from [faucet.circle.com](https://faucet.circle.com)

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/solrouter-defi-analyzer
cd solrouter-defi-analyzer
npm install
```

### Configuration

```bash
cp .env.example .env
```

Edit `.env`:

```env
SOLROUTER_API_KEY=sk_solrouter_your_key_here   # from solrouter.com after wallet connect
SOLANA_RPC_URL=https://api.devnet.solana.com
TARGET_WALLET=                                  # optional — prompted at runtime if blank
SOLROUTER_MODEL=gpt-oss-20b
```

**Getting your SolRouter API key:**
1. Go to [solrouter.com](https://solrouter.com)
2. Connect your Solana devnet wallet
3. Copy your `sk_solrouter_...` key from the dashboard

### Run

```bash
npm run dev
```

Or with a specific wallet:

```bash
TARGET_WALLET=<your_devnet_wallet> npm run dev
```

---

## Architecture

```
src/
├── index.ts              # Entry point — orchestrates the full flow
├── walletScanner.ts      # On-chain data fetching via @solana/web3.js
├── encryptedAnalysis.ts  # SolRouter SDK integration — encrypted inference
└── reportRenderer.ts     # Terminal report formatting (chalk)
```

### Key files explained

**`walletScanner.ts`** — Connects to Solana RPC, fetches all SPL token accounts, reads mint/freeze authorities, and assigns risk flags. No AI involved — pure on-chain data.

**`encryptedAnalysis.ts`** — The privacy layer. Builds a structured prompt from the wallet snapshot, sends it through the SolRouter SDK with `encrypted: true`, and parses the JSON risk report from the response. The prompt is encrypted by the Arcium RescueCipher on the client before it ever touches the network.

**`reportRenderer.ts`** — Formats and prints the risk report to the terminal. Includes the privacy verification proof block showing TEE attestation metadata and Solana proof status.

---

## Why This Use Case Demands Private Inference

DeFi portfolio analysis is uniquely sensitive:

1. **Your query IS your strategy.** Asking "is my 40 SOL position overexposed to stablecoin risk?" reveals your position size and risk tolerance. On a public API, this is now someone else's data.

2. **Front-running is real.** If your wallet address and balance are exposed during query processing, bots can infer upcoming trades before you make them.

3. **Audit trails matter.** With SolRouter, the Solana proof means you can *cryptographically prove* that your query was handled privately — not just trust a provider's privacy policy.

4. **No KYC attached.** Payment is USDC micropayments. No credit card, no identity, no account linking your portfolio queries to your real-world identity.

---

## Tech Stack

| Component | Technology |
|---|---|
| Encrypted inference | [SolRouter SDK](https://solrouter.com) |
| Client-side encryption | Arcium RescueCipher |
| TEE hardware | AWS Nitro Enclaves |
| Privacy proofs | Solana blockchain |
| Wallet scanning | `@solana/web3.js` |
| Payment | USDC devnet (Circle faucet) |
| Runtime | Node.js + TypeScript |

---

## SolRouter Account

This submission was built using a SolRouter account connected at [solrouter.com](https://solrouter.com).

---

*Posted on X: [@YourHandle](https://twitter.com) — tagging @SolRouterAI*
