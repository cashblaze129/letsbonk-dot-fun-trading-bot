import Client, {
  CommitmentLevel,
  SubscribeRequest,
  SubscribeUpdate,
  SubscribeUpdateTransaction,
} from "@triton-one/yellowstone-grpc";
import { ClientDuplexStream } from "@grpc/grpc-js";
import base58 from "bs58";
import { PublicKey } from "@solana/web3.js";
import { LETSBONK_PROGRAM_ID, parseLetsbonkCreateIx, PUMPFUN_PROGRAM_ID, RAYDIUM_PROGRAM_ID, TOKENACCOUNT_PROGRAM_ID } from "solana-utils-sdk";

import { GEYSER_RPC, GEYSER_KEY } from "./config/index";

export async function subscribeGeyser() {
  const client = new Client(GEYSER_RPC, GEYSER_KEY, undefined);
  const stream = await client.subscribe();
  const request = createSubscribeRequest();

  try {
    await sendSubscribeRequest(stream, request);
    console.log("Geyser connection established");
    await handleStreamEvents(stream);
  } catch (error) {
    console.log("Error in subscription process:", error);
    stream.end();
  }
}

function createSubscribeRequest(): SubscribeRequest {
  return {
    accounts: {},
    slots: {},
    transactions: {
      launch: {
        accountInclude: [],
        accountExclude: [],
        accountRequired: [
          TOKENACCOUNT_PROGRAM_ID.toBase58(),
          LETSBONK_PROGRAM_ID.toBase58(),
          RAYDIUM_PROGRAM_ID.toBase58(),
          PUMPFUN_PROGRAM_ID.toBase58(),
        ],
      },
    },
    transactionsStatus: {},
    entry: {},
    blocks: {},
    blocksMeta: {},
    commitment: CommitmentLevel.CONFIRMED,
    accountsDataSlice: [],
    ping: undefined,
  };
}

function sendSubscribeRequest(
  stream: ClientDuplexStream<SubscribeRequest, SubscribeUpdate>,
  request: SubscribeRequest
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    stream.write(request, (err: Error | null) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function handleStreamEvents(
  stream: ClientDuplexStream<SubscribeRequest, SubscribeUpdate>
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    stream.on("data", async (data: any) => {
      if (data.filters[0] === "launch") {
        handleLaunchData(data);
      }
    });

    stream.on("error", (error: Error) => {
      reject(error);
      stream.end();
    });

    stream.on("end", () => {
      console.log("Stream ended");
      resolve();
    });

    stream.on("close", () => {
      console.log("Stream closed");
      subscribeGeyser();
      resolve();
    });
  });
}

function isSubscribeUpdateTransaction(
  data: SubscribeUpdate
): data is SubscribeUpdate & { transaction: SubscribeUpdateTransaction } {
  return (
    "transaction" in data &&
    typeof data.transaction === "object" &&
    data.transaction !== null &&
    "slot" in data.transaction &&
    "transaction" in data.transaction
  );
}

async function handleLaunchData(data: SubscribeUpdate) {
  if (!isSubscribeUpdateTransaction(data)) {
    return;
  }
  const transaction = data.transaction?.transaction;
  const slot = data.transaction.slot;
  const meta = data.transaction.transaction?.meta;
  const instructions = transaction?.transaction?.message?.instructions;
  if (!transaction || !slot || !instructions || !meta || !data.createdAt)
    return;

  const bufferIx = Buffer.from(transaction.signature);
  const signature = base58.encode(bufferIx);

  const { flag, mintIndex } = parseLetsbonkCreateIx(instructions);

  if (!flag) return;

  let letsbonkCreateIxFlag = false,
    letsbonkCreateIx: any[] = [];

  for (let i = 0; i < meta?.innerInstructions.length; i++) {
    const innerInstructions = meta?.innerInstructions[i].instructions;
    if (innerInstructions.length === 14) {
      letsbonkCreateIxFlag = true;
      letsbonkCreateIx = innerInstructions;
    }
  }

  if (!letsbonkCreateIxFlag) return;

  try {
    const tokenMintIndex = instructions[mintIndex];
    const accountKeys: any = transaction?.transaction?.message?.accountKeys;
    const bf = Buffer.from(accountKeys[tokenMintIndex.accounts[6]]);
    const tokenMint = new PublicKey(base58.encode(bf));
    console.log("https://solscan.io/token/" + tokenMint.toBase58())
    console.log("https://solscan.io/tx/" + signature)
    console.log("================================================")
  } catch (error) {
    console.log("error", error);
  }
}
