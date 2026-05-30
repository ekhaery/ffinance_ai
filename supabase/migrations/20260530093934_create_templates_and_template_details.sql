create table templates (
  id bigint primary key generated always as identity,
  template_name varchar(255) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table template_details (
  id bigint primary key generated always as identity,
  template_id bigint not null references templates (id) on delete cascade,
  category_id bigint not null references categories (id),
  subcategory_id bigint not null references subcategories (id),
  amount numeric(15, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
