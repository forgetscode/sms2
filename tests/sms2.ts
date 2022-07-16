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

  const GetPDAMessage = async(master_id:PublicKey, message_id:number) => {

    const [ message, _ ] = await PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode("message"),
        master_id.toBuffer(),
        Buffer.from([message_id]),
      ],
      program.programId
    )

    return message;
  }
  
  const initializeChat = async(initializer:anchor.web3.Keypair, receiver:PublicKey, initializerChat:PublicKey, receiverChat:PublicKey, chatIdInitializer:number, chatIdReceiver:number) => {
      const master_id = anchor.web3.Keypair.generate();
      const tx = await program.methods.initializeChat(chatIdInitializer, chatIdReceiver, master_id.publicKey)
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

  const initializeMessage = async( initializer:anchor.web3.Keypair, receiver:PublicKey, initializerChat:PublicKey, receiverChat:PublicKey, message_id: PublicKey, chat_master_id:PublicKey, chat_message_count:number, text:string) => {
    const tx = await program.methods.initializeMessage(chat_master_id, chat_message_count, text)
    .accounts(
      {
        message: message_id,
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

  const initializeChatDynamic = async(initializer:anchor.web3.Keypair, receiver:PublicKey) => {
    const indexInitializer = await getIndexInitializer(initializer.publicKey) + 1;
    const indexReceiver = await getIndexReceiver(receiver) + 1;

    const initializerChat = await GetPDAInitializer(initializer.publicKey, indexInitializer);
    const receiverChat = await GetPDAReceiver(receiver, indexReceiver);

    const master_id = anchor.web3.Keypair.generate();

    const tx = await program.methods.initializeChat(indexInitializer, indexReceiver, master_id.publicKey)
    .accounts(
      {
        chatInitializer: initializerChat,
        chatReceiver: receiverChat,
        initializer: initializer.publicKey,
        receiver: receiver,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    ).signers([initializer]).rpc();

    return [initializerChat, receiverChat];
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

    const chat_accounts = await initializeChatDynamic(pair2[0], pair2[1].publicKey);

    let data = await program.account.chat.fetch(chat_accounts[0]);

    let chat_master_id = data.masterId;
    let chat_message_count = data.messageCount;

    //send message with chat account and user

    //send message, get messages

    /*
    const message1 = await GetPDAMessage(chat_master_id, chat_message_count);

    let data2 = await program.account.message.fetch(message1);

    console.log(data2);
    */

  });
});
