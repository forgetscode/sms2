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

    const user1 = pair1[0];
    const user2 = pair1[1];

    //test create chat send 2 messages

    //initialize chat between user 1 and user 2
    const tx = await initializeChatDynamic(user1, user2.publicKey);

    //get chat accounts for user 1  and 2(unnecessary but shown for comprehension)
    let account_chats = await getAccountChats(user1.publicKey);
    let account_chats2 = await getAccountChats(user2.publicKey);

    //these are both the same
    let user1_first_chat = account_chats[0]
    let user2_first_chat = account_chats2[0]

    //initialize message in first chat from user 1 from pair 2's chat accounts
    const tx2 = await initializeMessage(user1_first_chat, user1, "boop");

    //...
    const tx3 = await initializeMessage(user2_first_chat, user2, "boooop back to you");

    //Get messages from the chat
    const messages = await getMessagesByChat(user1_first_chat);


    const chatAccount = await program.account.chat.fetch(user1_first_chat);
    console.log(chatAccount);

    const chatAccount2 = await program.account.chat.fetch(user2_first_chat);
    console.log(chatAccount);

    const tx4 = await program.methods.closeChat()
    .accounts(
      {
        chatInitializer: user1_first_chat,
        chatReceiver: user2_first_chat,
        initializer: user1.publicKey,
        receiver: user1.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    ).signers([user1]).rpc();
    

  });
});
