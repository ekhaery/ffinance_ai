alter table expenses rename column name to expense_name;
alter table expenses alter column family_member set not null;
alter table expenses add column created_at timestamptz not null default now();
alter table expenses add column updated_at timestamptz not null default now();
