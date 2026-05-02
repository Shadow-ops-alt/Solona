# ChainRemit

ChainRemit is a Solana-powered remittance demo focused on fast, low-cost transfers for users sending money home. The app shows a wallet-style dashboard, remittance creation flow, receiver claim demo, recurring transfers, activity tracking, and an agent console for assisted cash-out workflows.

This project is built as a monorepo with a web client, relayer logic, and an escrow program.

## Overview

ChainRemit demonstrates a remittance flow where a sender can create a transfer, lock funds through an escrow-style flow, and allow a recipient or agent-assisted receiver to claim the payout.

The current version is designed for development and demo use.

## Features

- Wallet overview dashboard
- Send money flow
- Activity history
- Recurring remittance demo
- Receiver claim screen
- Agent console with PIN-gated access
- Solana devnet-focused workflow
- Escrow-oriented transfer model
- Minimal dark UI with responsive layouts

## Tech Stack

- React
- Vite
- TypeScript
- Node.js
- Solana Web3.js
- Anchor
- Metaplex UMI
- npm workspaces

## Project Structure

```txt
chain-remit/
├── apps/
│   ├── web/          # Frontend application
│   └── relayer/      # Relayer and Solana interaction logic
├── programs/
│   └── escrow/       # Anchor escrow program
├── package.json
├── package-lock.json
└── README.md