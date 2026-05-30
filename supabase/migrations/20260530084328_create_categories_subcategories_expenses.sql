create table categories (
  id bigint primary key generated always as identity,
  name text not null
);

create table subcategories (
  id bigint primary key generated always as identity,
  name text not null,
  category_id bigint not null references categories (id) on delete cascade
);

create table expenses (
  id bigint primary key generated always as identity,
  name text not null,
  subcategory_id bigint not null references subcategories (id) on delete restrict,
  amount numeric(15, 2) not null
);
