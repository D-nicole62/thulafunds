#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, token, Address, Env, String};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidMilestone = 3,
    AlreadyReleased = 4,
    InsufficientEscrow = 5,
    Unauthorized = 6,
}

#[contracttype]
#[derive(Clone)]
pub struct Milestone {
    pub title: String,
    pub amount: i128,
    pub released: bool,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    Escrow,
    MilestoneCount,
    Milestone(u32),
}

#[contract]
pub struct MilestoneContract;

#[contractimpl]
impl MilestoneContract {
    pub fn initialize(
        e: Env,
        admin: Address,
        token: Address,
        escrow: Address,
        milestones: soroban_sdk::Vec<Milestone>,
    ) -> Result<(), Error> {
        if e.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }

        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage().instance().set(&DataKey::Token, &token);
        e.storage().instance().set(&DataKey::Escrow, &escrow);

        let count = milestones.len();
        for i in 0..count {
            let m = milestones.get(i).unwrap();
            e.storage()
                .instance()
                .set(&DataKey::Milestone(i), &m);
        }
        e.storage().instance().set(&DataKey::MilestoneCount, &count);
        Ok(())
    }

    /// Release a milestone tranche from escrow to the organizer.
    pub fn release_milestone(e: Env, index: u32) -> Result<(), Error> {
        let admin: Address = e
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        let count: u32 = e
            .storage()
            .instance()
            .get(&DataKey::MilestoneCount)
            .ok_or(Error::NotInitialized)?;
        if index >= count {
            return Err(Error::InvalidMilestone);
        }

        let mut milestone: Milestone = e
            .storage()
            .instance()
            .get(&DataKey::Milestone(index))
            .ok_or(Error::InvalidMilestone)?;
        if milestone.released {
            return Err(Error::AlreadyReleased);
        }

        let token: Address = e
            .storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialized)?;
        let escrow: Address = e
            .storage()
            .instance()
            .get(&DataKey::Escrow)
            .ok_or(Error::NotInitialized)?;

        let token_client = token::Client::new(&e, &token);
        let escrow_balance = token_client.balance(&escrow);
        if escrow_balance < milestone.amount {
            return Err(Error::InsufficientEscrow);
        }

        token_client.transfer(&escrow, &admin, &milestone.amount);
        milestone.released = true;
        e.storage()
            .instance()
            .set(&DataKey::Milestone(index), &milestone);

        e.events()
            .publish(("milestone_released", index), (milestone.amount, admin));
        Ok(())
    }

    pub fn milestone_count(e: Env) -> u32 {
        e.storage()
            .instance()
            .get(&DataKey::MilestoneCount)
            .unwrap_or(0)
    }

    pub fn get_milestone(e: Env, index: u32) -> Milestone {
        e.storage()
            .instance()
            .get(&DataKey::Milestone(index))
            .expect("milestone not found")
    }
}
