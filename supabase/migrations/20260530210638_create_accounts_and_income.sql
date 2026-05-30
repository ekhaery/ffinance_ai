-- Accounts master table
create table accounts (
  id          serial primary key,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Income table
create table income (
  id          serial primary key,
  amount      numeric(15, 2) not null,
  account_id  int not null references accounts(id),
  date        date not null default current_date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
