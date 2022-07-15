import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Sms2 } from "../target/types/sms2";
import { PublicKey } from '@solana/web3.js'

describe("sms2", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Sms2 as Program<Sms2>;

  
  const receiver = anchor.web3.Keypair.generate();

  const initializer = anchor.web3.Keypair.generate();

  it("Is initialized!", async () => {
    // Add your test here.
    await program.provider.connection.confirmTransaction(
      await program.provider.connection.requestAirdrop(initializer.publicKey, 10000000000),
      "confirmed"
    );

    await program.provider.connection.confirmTransaction(
      await program.provider.connection.requestAirdrop(receiver.publicKey, 10000000000),
      "confirmed"
    );

    const [chat_initializer, _ ] = await PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode('chat_initializer'),
        initializer.publicKey.toBuffer(),
      ],
      program.programId
    )

    const [chat_receiver, __] = await PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode('chat_receiver'),
        receiver.publicKey.toBuffer(),
      ],
      program.programId
    )

    console.log("tony the tiger says you're great!");


    const tx = await program.methods.initializeChat(8)
    .accounts(
      {
        chatInitializer: chat_initializer,
        chatReceiver: chat_receiver,
        initializer: initializer.publicKey,
        receiver: receiver.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    ).signers([initializer]).rpc();

    let messagedata = await program.account.chat.fetch(chat_initializer);
    console.log("message data", messagedata);

    console.log("Your transaction signature", tx);
  });
});
