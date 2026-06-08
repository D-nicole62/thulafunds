#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, Env,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    GoalNotMet = 3,
    CampaignExpired = 4,
    CampaignNotExpired = 5,
    NothingToRefund = 6,
    Unauthorized = 7,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    Goal,
    Deadline,
    TotalRaised,
    Contribution(Address),
}

#[contract]
pub struct CrowdfundContract;

#[contractimpl]
impl CrowdfundContract {
    /// Constructor — called when CampaignFactory deploys a new instance.
    pub fn __constructor(
        e: Env,
        admin: Address,
        token: Address,
        goal: i128,
        deadline: u64,
    ) {
        Self::initialize(e, admin, token, goal, deadline).unwrap();
    }

    /// Initialize escrow: locks USDC until goal met or deadline passes.
    pub fn initialize(
        e: Env,
        admin: Address,
        token: Address,
        goal: i128,
        deadline: u64,
    ) -> Result<(), Error> {
        if e.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        if goal <= 0 {
            return Err(Error::Unauthorized);
        }

        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage().instance().set(&DataKey::Token, &token);
        e.storage().instance().set(&DataKey::Goal, &goal);
        e.storage().instance().set(&DataKey::Deadline, &deadline);
        e.storage().instance().set(&DataKey::TotalRaised, &0_i128);
        Ok(())
    }

    /// Donor deposits USDC into on-chain escrow.
    pub fn deposit(e: Env, donor: Address, amount: i128) -> Result<(), Error> {
        donor.require_auth();
        if amount <= 0 {
            return Err(Error::Unauthorized);
        }

        let deadline: u64 = e
            .storage()
            .instance()
            .get(&DataKey::Deadline)
            .ok_or(Error::NotInitialized)?;
        if e.ledger().timestamp() > deadline {
            return Err(Error::CampaignExpired);
        }

        let token: Address = e
            .storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialized)?;
        let token_client = token::Client::new(&e, &token);
        token_client.transfer(
            &donor,
            &e.current_contract_address(),
            &amount,
        );

        let key = DataKey::Contribution(donor.clone());
        let existing: i128 = e.storage().persistent().get(&key).unwrap_or(0);
        e.storage().persistent().set(&key, &(existing + amount));

        let total: i128 = e
            .storage()
            .instance()
            .get(&DataKey::TotalRaised)
            .unwrap_or(0);
        e.storage()
            .instance()
            .set(&DataKey::TotalRaised, &(total + amount));

        e.events()
            .publish(("deposit", donor), (amount, total + amount));
        Ok(())
    }

    /// Organizer withdraws escrow when funding goal is met.
    pub fn withdraw(e: Env) -> Result<(), Error> {
        let admin: Address = e
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        let goal: i128 = e
            .storage()
            .instance()
            .get(&DataKey::Goal)
            .ok_or(Error::NotInitialized)?;
        let total: i128 = e
            .storage()
            .instance()
            .get(&DataKey::TotalRaised)
            .unwrap_or(0);

        if total < goal {
            return Err(Error::GoalNotMet);
        }

        let token: Address = e
            .storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialized)?;
        let token_client = token::Client::new(&e, &token);
        token_client.transfer(&e.current_contract_address(), &admin, &total);

        e.storage().instance().set(&DataKey::TotalRaised, &0_i128);
        e.events().publish(("withdraw", admin), total);
        Ok(())
    }

    /// Donor refunds their contribution after campaign expires without meeting goal.
    pub fn refund(e: Env, donor: Address) -> Result<(), Error> {
        donor.require_auth();

        let deadline: u64 = e
            .storage()
            .instance()
            .get(&DataKey::Deadline)
            .ok_or(Error::NotInitialized)?;
        if e.ledger().timestamp() <= deadline {
            return Err(Error::CampaignNotExpired);
        }

        let goal: i128 = e
            .storage()
            .instance()
            .get(&DataKey::Goal)
            .ok_or(Error::NotInitialized)?;
        let total: i128 = e
            .storage()
            .instance()
            .get(&DataKey::TotalRaised)
            .unwrap_or(0);
        if total >= goal {
            return Err(Error::GoalNotMet);
        }

        let key = DataKey::Contribution(donor.clone());
        let amount: i128 = e.storage().persistent().get(&key).unwrap_or(0);
        if amount <= 0 {
            return Err(Error::NothingToRefund);
        }

        let token: Address = e
            .storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialized)?;
        let token_client = token::Client::new(&e, &token);
        token_client.transfer(&e.current_contract_address(), &donor, &amount);

        e.storage().persistent().set(&key, &0_i128);
        e.storage()
            .instance()
            .set(&DataKey::TotalRaised, &(total - amount));

        e.events().publish(("refund", donor), amount);
        Ok(())
    }

    /// Live escrow balance — read by frontend progress bars via Soroban RPC.
    pub fn balance(e: Env) -> i128 {
        e.storage()
            .instance()
            .get(&DataKey::TotalRaised)
            .unwrap_or(0)
    }

    pub fn get_goal(e: Env) -> i128 {
        e.storage()
            .instance()
            .get(&DataKey::Goal)
            .unwrap_or(0)
    }

    pub fn get_deadline(e: Env) -> u64 {
        e.storage()
            .instance()
            .get(&DataKey::Deadline)
            .unwrap_or(0)
    }

    pub fn get_admin(e: Env) -> Address {
        e.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("not initialized")
    }
}
