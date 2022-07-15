use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod sms2 {
    use super::*;

    pub fn initialize_chat(ctx: Context<InitializeChat>, chat_id_initializer:u8, chat_id_receiver:u8) -> Result<()> {
        let chat_initializer = &mut ctx.accounts.chat_initializer;
        let chat_receiver = &mut ctx.accounts.chat_receiver;

        chat_initializer.initializer = ctx.accounts.initializer.key();
        chat_receiver.initializer = ctx.accounts.initializer.key();

        chat_initializer.receiver = ctx.accounts.receiver.key();
        chat_receiver.receiver = ctx.accounts.receiver.key();

        chat_initializer.chat_id = chat_id_initializer;
        chat_receiver.chat_id = chat_id_receiver;

        
        chat_initializer.bump = *ctx.bumps.get("chat_initializer").unwrap();
        chat_receiver.bump = *ctx.bumps.get("chat_receiver").unwrap();

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(chat_id_initializer:u8, chat_id_receiver:u8)]
pub struct InitializeChat<'info>  {
    #[account(
        init,
        payer = initializer,
        space = 8 + 32 + 32 + 1 + 1,
        seeds = [b"chat_initializer", initializer.key().as_ref(), chat_id_initializer.to_le_bytes().as_ref()], 
        bump
    )]
    pub chat_initializer: Account<'info, Chat>,
    #[account(
        init,
        payer = initializer,
        space = 8 + 32 + 32 + 1 + 1,
        seeds = [b"chat_receiver", receiver.key().as_ref(), chat_id_receiver.to_le_bytes().as_ref()], 
        bump
    )]
    pub chat_receiver: Account<'info, Chat>,

    #[account(mut)]
    pub initializer: Signer<'info>,
    pub receiver: SystemAccount<'info>,
    pub system_program: Program<'info, System>
}


#[account]
pub struct Chat {         //8
    initializer: Pubkey,  //32
    receiver: Pubkey,     //32
    chat_id: u8,          //1
    bump:u8,              //1
}
