-- Add expense_id column
alter table balance add column expense_id int references expenses(id) on delete set null;

-- Seed: match negative-amount expense balance records to expenses by amount + account
update balance b
set expense_id = e.id
from expenses e
where b.type = 'expense'
  and b.amount < 0
  and (-b.amount) = e.amount
  and b.account_id = e.account_id;
