create table
  public.subscriptions (
    id uuid not null default gen_random_uuid (),
    user_id uuid not null,
    name text not null,
    amount numeric(12, 2) not null,
    account_id uuid not null,
    interval text not null default 'monthly', -- 'monthly', 'weekly', 'yearly'
    next_date date not null,
    status text not null default 'active',
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint subscriptions_pkey primary key (id),
    constraint subscriptions_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
    constraint subscriptions_account_id_fkey foreign key (account_id) references public.accounts (id) on delete cascade
  );

-- Enable RLS
alter table public.subscriptions enable row level security;

-- Create policies
create policy "Users can view their own subscriptions"
  on public.subscriptions for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own subscriptions"
  on public.subscriptions for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own subscriptions"
  on public.subscriptions for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own subscriptions"
  on public.subscriptions for delete
  using ( auth.uid() = user_id );
