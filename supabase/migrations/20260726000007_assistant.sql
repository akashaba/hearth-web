-- AI Financial Assistant: conversations, messages, and per-tool-call audit log.

create table public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  household_id text not null references public.households(id) on delete cascade,
  title text,
  created_by_user_id text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index assistant_conversations_household_recent_idx
  on public.assistant_conversations(household_id, last_message_at desc);

alter table public.assistant_conversations enable row level security;

create policy "assistant_conversations_select_member" on public.assistant_conversations
  for select using (public.is_household_member(household_id));
create policy "assistant_conversations_insert_member" on public.assistant_conversations
  for insert with check (public.is_household_member(household_id));
create policy "assistant_conversations_update_member" on public.assistant_conversations
  for update using (public.is_household_member(household_id))
             with check (public.is_household_member(household_id));
create policy "assistant_conversations_delete_member" on public.assistant_conversations
  for delete using (public.is_household_member(household_id));

create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content jsonb not null,
  created_at timestamptz not null default now()
);

create index assistant_messages_conv_idx on public.assistant_messages(conversation_id, created_at);

alter table public.assistant_messages enable row level security;

create policy "assistant_messages_select_member" on public.assistant_messages
  for select using (
    exists (
      select 1 from public.assistant_conversations c
      where c.id = assistant_messages.conversation_id
        and public.is_household_member(c.household_id)
    )
  );
create policy "assistant_messages_insert_member" on public.assistant_messages
  for insert with check (
    exists (
      select 1 from public.assistant_conversations c
      where c.id = assistant_messages.conversation_id
        and public.is_household_member(c.household_id)
    )
  );

create table public.assistant_tool_calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations(id) on delete cascade,
  tool_name text not null,
  args jsonb not null,
  result_summary text,
  ms int not null,
  created_at timestamptz not null default now()
);

create index assistant_tool_calls_conv_idx on public.assistant_tool_calls(conversation_id, created_at);

alter table public.assistant_tool_calls enable row level security;

create policy "assistant_tool_calls_select_member" on public.assistant_tool_calls
  for select using (
    exists (
      select 1 from public.assistant_conversations c
      where c.id = assistant_tool_calls.conversation_id
        and public.is_household_member(c.household_id)
    )
  );
