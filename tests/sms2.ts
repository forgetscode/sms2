import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Sms2 } from "../target/types/sms2";
import { PublicKey } from '@solana/web3.js'

describe("sms2", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Sms2 as Program<Sms2>;

  
  const genAccPair = async() => {
    const receiver = anchor.web3.Keypair.generate();

    const initializer = anchor.web3.Keypair.generate();

    await program.provider.connection.confirmTransaction(
      await program.provider.connection.requestAirdrop(initializer.publicKey, 10000000000),
      "confirmed"
    );

    await program.provider.connection.confirmTransaction(
      await program.provider.connection.requestAirdrop(receiver.publicKey, 10000000000),
      "confirmed"
    );

    return [initializer, receiver]
  }


  const GetPDAInitializer = async(initializer:PublicKey, chat_id:number) => {

    const [chat_initializer, _ ] = await PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode("chat_initializer"),
        initializer.toBuffer(),
        Buffer.from([chat_id]),
      ],
      program.programId
    )

    return chat_initializer;
  }

  const GetPDAReceiver = async(receiver:PublicKey, chat_id:number) => {

    const [chat_receiver, _ ] = await PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode("chat_receiver"),
        receiver.toBuffer(),
        Buffer.from([chat_id]),
      ],
      program.programId
    )

    return chat_receiver;
  }
  

  const initializeChat = async(initializer:anchor.web3.Keypair, receiver:PublicKey, initializerChat:PublicKey, receiverChat:PublicKey, chatIdInitializer:number, chatIdReceiver:number) => {
      const tx = await program.methods.initializeChat(chatIdInitializer, chatIdReceiver)
      .accounts(
        {
          chatInitializer: initializerChat,
          chatReceiver: receiverChat,
          initializer: initializer.publicKey,
          receiver: receiver,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
      ).signers([initializer]).rpc();

      return tx;
  }


  const getIndexInitializer = async(account:PublicKey) => {
    let index = 0;
    for (let i = 1; i < 7; i++) { 
      let cursor = await GetPDAInitializer(account, i);
      try{
        let data = await program.account.chat.fetch(cursor);
      }
      catch{
        index = i -1;
        break
      }
    }
    return index
  }

  const getIndexReceiver = async(account:PublicKey) => {
    let index = 0;
    for (let i = 1; i < 7; i++) { 
      let cursor = await GetPDAReceiver(account, i);
      try{
        let data = await program.account.chat.fetch(cursor);
      }
      catch{
        index = i - 1;
        break
      }
    }
    return index
  }



  it("Is initialized!", async () => {

    const pair1 = await genAccPair();

    const pair2 = await genAccPair();

    const pair1_initializer_chat1 = await GetPDAInitializer(pair1[0].publicKey, 1);

    const pair1_receiver_chat1 = await GetPDAReceiver(pair1[1].publicKey, 1);

    const pair2_initializer_chat1 = await GetPDAInitializer(pair2[0].publicKey, 1);

    const pair1_receiver_chat2 = await GetPDAReceiver(pair1[1].publicKey, 2);

    const pair1_initializer_chat2 = await GetPDAInitializer(pair1[0].publicKey, 2);

    const tx = await initializeChat(pair1[0], pair1[1].publicKey, pair1_initializer_chat1, pair1_receiver_chat1, 1, 1);

    console.log(tx);


    const tx2 = await initializeChat(pair2[0], pair1[1].publicKey, pair2_initializer_chat1, pair1_receiver_chat2, 1, 2);

    console.log(tx2);

    const indexInitializer = await getIndexInitializer(pair1[1].publicKey);

    console.log(indexInitializer);

    
    const indexReceiver= await getIndexReceiver(pair1[1].publicKey);

    console.log(indexReceiver);

    /*
    const tx = await program.methods.initializeChat(1)
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

    const [chat_initializer_2, _2 ] = await PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode('chat_initializer'),
        receiver.publicKey.toBuffer(),
      ],
      program.programId
    )

    const [chat_receiver_2, __2] = await PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode('chat_receiver'),
        initializer.publicKey.toBuffer(),
      ],
      program.programId
    )


    const tx2 = await program.methods.initializeChat(2)
    .accounts(
      {
        chatInitializer: chat_initializer_2,
        chatReceiver: chat_receiver_2,
        initializer: receiver.publicKey,
        receiver: initializer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    ).signers([receiver]).rpc();


    console.log("Your transaction signature", tx);
    */
  });
});
