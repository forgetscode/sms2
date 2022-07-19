import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Sms2 } from "../target/types/sms2";
import { PublicKey } from '@solana/web3.js'


interface ChatAccount {
  initializer:PublicKey,
  receiver:PublicKey,
  masterId:PublicKey,
  chatId:number,
  otherChatId:number,
  messageCount:number,
  bump:number,
}


describe("sms2", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Sms2 as Program<Sms2>;

  
  const genAccPair = async() => {
    const receiver = anchor.web3.Keypair.generate();

    const initializer = anchor.web3.Keypair.generate();

    await program.provider.connection.confirmTransaction(
      await program.provider.connection.requestAirdrop(initializer.publicKey, 1000000000000),
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

  const getInitializerChats = async(account:PublicKey) => {
    let InitializerChats = []
    for (let i = 1; i < 7; i++) { 
      let cursor = await GetPDAInitializer(account, i);
      try{
         await program.account.chat.fetch(cursor);
        InitializerChats.push(cursor);
      }
      catch{
        continue
      }
    }
    return InitializerChats
  }

  const getReceiverChats = async(account:PublicKey) => {
    let receiverChats = []
    for (let i = 1; i < 7; i++) { 
      let cursor = await GetPDAReceiver(account, i);
      try{
        await program.account.chat.fetch(cursor);
        receiverChats.push(cursor);
      }
      catch{
        continue
      }
    }
    return receiverChats
  }

  const getAccountChats = async(account:PublicKey) => {
    const initializeChats = await getInitializerChats(account);
    const ReceiverChats = await getReceiverChats(account);

    return initializeChats.concat(ReceiverChats);
  }

  const getMessagesByChat = async(chatAccountPDA:PublicKey) => {

    const chatAccount = await program.account.chat.fetch(chatAccountPDA);

    const data = [];

    for (let i=0; i <= chatAccount.messageCount; i++){
      try{
        let messagePDA = await GetPDAMessage(chatAccount.masterId, i);
        let messageData = await program.account.message.fetch(messagePDA);
        console.log("message data:", messageData);
        data.push(messageData);
      }
      catch{
        continue;
      }
    }
    
    return data
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

    return tx;
  }

  const initializeMessage = async( chatAccountPDA:PublicKey, initializer:anchor.web3.Keypair, text:string ) => {
    let initializerChat:PublicKey;
    let receiverChat:PublicKey;
    let receiver:PublicKey;

    const chatAccount = await program.account.chat.fetch(chatAccountPDA);

    if (initializer.publicKey.toBase58() == chatAccount.initializer.toBase58()){
      initializerChat = await GetPDAInitializer(chatAccount.initializer, chatAccount.chatId);
      receiverChat = await GetPDAReceiver(chatAccount.receiver, chatAccount.otherChatId);
      receiver = chatAccount.receiver;
    }
    
    else{
      initializerChat = await GetPDAReceiver(chatAccount.receiver, chatAccount.chatId);
      receiverChat = await GetPDAInitializer(chatAccount.initializer, chatAccount.otherChatId);
      receiver = chatAccount.initializer;
    }
    
    const message_id = await GetPDAMessage(chatAccount.masterId, chatAccount.messageCount);

    const tx = await program.methods.initializeMessage(chatAccount.masterId, chatAccount.messageCount, text)
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

  it("Is initialized!", async () => {

    /////////////////////////////////////////////////////////////////////////////////
    const pair1 = await genAccPair();

    const pair2 = await genAccPair();

    const pair1_initializer_chat1 = await GetPDAInitializer(pair1[0].publicKey, 1);

    const pair1_receiver_chat1 = await GetPDAReceiver(pair1[1].publicKey, 1);

    const pair2_initializer_chat1 = await GetPDAInitializer(pair2[0].publicKey, 1);

    const pair1_receiver_chat2 = await GetPDAReceiver(pair1[1].publicKey, 2);

    const pair1_initializer_chat2 = await GetPDAInitializer(pair1[0].publicKey, 2);

    const tx = await initializeChatDynamic(pair2[0], pair2[1].publicKey);

    let account_chats = await getAccountChats(pair2[0].publicKey);

    const tx2 = await initializeMessage(account_chats[0], pair2[0], "boop");

    const tx3 = await initializeMessage(account_chats[0], pair2[0], "boooop");

    const tx4 = await initializeMessage(account_chats[0], pair2[0], "boooop");

    const tx5 = await initializeMessage(account_chats[0], pair2[0], "boooop");

    const tx6 = await initializeMessage(account_chats[0], pair2[0], "boooop");
    
    const messages = await getMessagesByChat(account_chats[0]);

    console.log(messages);

    /*

    let data2 = await program.account.message.fetch(message1);

    console.log(data2);
    */

  });
});
