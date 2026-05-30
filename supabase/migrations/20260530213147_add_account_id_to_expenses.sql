alter table expenses
  add column account_id int references accounts(id);
