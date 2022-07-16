use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod sms2 {
    use super::*;

    pub fn initialize_chat(ctx: Context<InitializeChat>, chat_id_initializer:u8, chat_id_receiver:u8, master_id:Pubkey) -> Result<()> {
        let chat_initializer = &mut ctx.accounts.chat_initializer;
        let chat_receiver = &mut ctx.accounts.chat_receiver;

        chat_initializer.initializer = ctx.accounts.initializer.key();
        chat_receiver.initializer = ctx.accounts.initializer.key();

        chat_initializer.receiver = ctx.accounts.receiver.key();
        chat_receiver.receiver = ctx.accounts.receiver.key();

        chat_initializer.master_id = master_id;
        chat_receiver.master_id = master_id;

        
        chat_initializer.chat_id = chat_id_initializer;
        chat_receiver.chat_id = chat_id_receiver;

        chat_initializer.message_count = 0;
        chat_receiver.message_count = 0;
        
        chat_initializer.bump = *ctx.bumps.get("chat_initializer").unwrap();
        chat_receiver.bump = *ctx.bumps.get("chat_receiver").unwrap();

        Ok(())
    }

    pub fn initialize_message(ctx: Context<InitializeMessage>, _master_id:Pubkey, _message_id:u8,  text:String) -> Result<()> {
        let message = &mut ctx.accounts.message;
        let chat_initializer = &mut ctx.accounts.chat_initializer;
        let chat_receiver = &mut ctx.accounts.chat_receiver;

        require!(text.len() < 255, MessageError::InvalidMessage);

        chat_initializer.message_count = chat_initializer.message_count + 1;

        chat_receiver.message_count = chat_receiver.message_count + 1;

        message.initializer = ctx.accounts.initializer.key();

        message.message = text;

        message.bump = *ctx.bumps.get("message").unwrap();

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(chat_id_initializer:u8, chat_id_receiver:u8, master_id:Pubkey)]
pub struct InitializeChat<'info>  {
    #[account(
        init,
        payer = initializer,
        space = 8 + 32 + 32 + 32 + 1 + 1 + 1,
        constraint = initializer.key() != receiver.key(),
        seeds = [b"chat_initializer", initializer.key().as_ref(), chat_id_initializer.to_le_bytes().as_ref()], 
        bump
    )]
    pub chat_initializer: Account<'info, Chat>,
    #[account(
        init,
        payer = initializer,
        space = 8 + 32 + 32 + 32 + 1 + 1 + 1,
        constraint = initializer.key() != receiver.key(),
        seeds = [b"chat_receiver", receiver.key().as_ref(), chat_id_receiver.to_le_bytes().as_ref()], 
        bump
    )]
    pub chat_receiver: Account<'info, Chat>,

    #[account(mut)]
    pub initializer: Signer<'info>,
    pub receiver: SystemAccount<'info>,
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
#[instruction(master_id: Pubkey, message_id: u8, text:String)]
pub struct InitializeMessage<'info>  {
    #[account(
        init,
        payer = initializer,
        space = Message::space(&text),
        seeds = [b"message",  master_id.as_ref(), message_id.to_le_bytes().as_ref()],
        bump
    )]
    pub message: Account<'info, Message>,
    #[account(mut)]
    pub initializer: Signer<'info>,
    pub receiver: SystemAccount<'info>,
    #[account(
        mut,
        constraint = initializer.key() == chat_receiver.initializer.key() || 
        initializer.key() == chat_receiver.receiver.key(),
        constraint = receiver.key() == chat_receiver.initializer.key() || 
        receiver.key() == chat_receiver.receiver.key(),
        constraint = initializer.key() != receiver.key()
    )]
    pub chat_receiver: Account<'info, Chat>,
    #[account(
        mut,
        constraint = initializer.key() == chat_initializer.initializer.key() || 
        initializer.key() == chat_initializer.receiver.key(),
        constraint = receiver.key() == chat_initializer.initializer.key() || 
        receiver.key() == chat_initializer.receiver.key(),
        constraint = initializer.key() != receiver.key()
    )]
    pub chat_initializer: Account<'info, Chat>,
    pub system_program: Program<'info, System>
}

#[account]
pub struct Chat {          //8
    initializer: Pubkey,   //32
    receiver: Pubkey,      //32
    master_id: Pubkey,     //32
    chat_id: u8,           //1
    message_count: u8,     //1
    bump:u8,               //1
}

impl Message {
    fn space(text: &str) -> usize {
        // discriminator
        8 +
        // String
        4 + text.len() +
        //Pubkey
        32 +
        // u8
        1
    }
}

#[account]
pub struct Message {
    message: String,       //252 max
    initializer:Pubkey,    //32
    bump: u8,              //1
}

#[error_code]
pub enum MessageError {
    InvalidMessage,
}