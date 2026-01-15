
  create table "public"."quests" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "user_id" uuid not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."quests" enable row level security;


  create table "public"."tasks" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "due_date" text not null,
    "completed" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "quest_id" uuid not null,
    "priority" text default 'medium'::text,
    "xp_value" integer default 10,
    "completed_at" timestamp with time zone
      );


alter table "public"."tasks" enable row level security;


  create table "public"."user_profiles" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "xp_total" integer default 0,
    "level" integer default 1,
    "current_streak" integer default 0,
    "longest_streak" integer default 0,
    "last_active_date" date,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."user_profiles" enable row level security;

CREATE INDEX idx_quests_user_id ON public.quests USING btree (user_id);

CREATE INDEX idx_tasks_due_date ON public.tasks USING btree (due_date);

CREATE INDEX idx_tasks_quest_id ON public.tasks USING btree (quest_id);

CREATE UNIQUE INDEX quests_pkey ON public.quests USING btree (id);

CREATE UNIQUE INDEX tasks_pkey ON public.tasks USING btree (id);

CREATE UNIQUE INDEX user_profiles_pkey ON public.user_profiles USING btree (id);

CREATE UNIQUE INDEX user_profiles_user_id_key ON public.user_profiles USING btree (user_id);

alter table "public"."quests" add constraint "quests_pkey" PRIMARY KEY using index "quests_pkey";

alter table "public"."tasks" add constraint "tasks_pkey" PRIMARY KEY using index "tasks_pkey";

alter table "public"."user_profiles" add constraint "user_profiles_pkey" PRIMARY KEY using index "user_profiles_pkey";

alter table "public"."quests" add constraint "quests_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."quests" validate constraint "quests_user_id_fkey";

alter table "public"."tasks" add constraint "tasks_quest_id_fkey" FOREIGN KEY (quest_id) REFERENCES public.quests(id) ON DELETE CASCADE not valid;

alter table "public"."tasks" validate constraint "tasks_quest_id_fkey";

alter table "public"."user_profiles" add constraint "user_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_user_id_fkey";

alter table "public"."user_profiles" add constraint "user_profiles_user_id_key" UNIQUE using index "user_profiles_user_id_key";

grant delete on table "public"."quests" to "anon";

grant insert on table "public"."quests" to "anon";

grant references on table "public"."quests" to "anon";

grant select on table "public"."quests" to "anon";

grant trigger on table "public"."quests" to "anon";

grant truncate on table "public"."quests" to "anon";

grant update on table "public"."quests" to "anon";

grant delete on table "public"."quests" to "authenticated";

grant insert on table "public"."quests" to "authenticated";

grant references on table "public"."quests" to "authenticated";

grant select on table "public"."quests" to "authenticated";

grant trigger on table "public"."quests" to "authenticated";

grant truncate on table "public"."quests" to "authenticated";

grant update on table "public"."quests" to "authenticated";

grant delete on table "public"."quests" to "service_role";

grant insert on table "public"."quests" to "service_role";

grant references on table "public"."quests" to "service_role";

grant select on table "public"."quests" to "service_role";

grant trigger on table "public"."quests" to "service_role";

grant truncate on table "public"."quests" to "service_role";

grant update on table "public"."quests" to "service_role";

grant delete on table "public"."tasks" to "anon";

grant insert on table "public"."tasks" to "anon";

grant references on table "public"."tasks" to "anon";

grant select on table "public"."tasks" to "anon";

grant trigger on table "public"."tasks" to "anon";

grant truncate on table "public"."tasks" to "anon";

grant update on table "public"."tasks" to "anon";

grant delete on table "public"."tasks" to "authenticated";

grant insert on table "public"."tasks" to "authenticated";

grant references on table "public"."tasks" to "authenticated";

grant select on table "public"."tasks" to "authenticated";

grant trigger on table "public"."tasks" to "authenticated";

grant truncate on table "public"."tasks" to "authenticated";

grant update on table "public"."tasks" to "authenticated";

grant delete on table "public"."tasks" to "service_role";

grant insert on table "public"."tasks" to "service_role";

grant references on table "public"."tasks" to "service_role";

grant select on table "public"."tasks" to "service_role";

grant trigger on table "public"."tasks" to "service_role";

grant truncate on table "public"."tasks" to "service_role";

grant update on table "public"."tasks" to "service_role";

grant delete on table "public"."user_profiles" to "anon";

grant insert on table "public"."user_profiles" to "anon";

grant references on table "public"."user_profiles" to "anon";

grant select on table "public"."user_profiles" to "anon";

grant trigger on table "public"."user_profiles" to "anon";

grant truncate on table "public"."user_profiles" to "anon";

grant update on table "public"."user_profiles" to "anon";

grant delete on table "public"."user_profiles" to "authenticated";

grant insert on table "public"."user_profiles" to "authenticated";

grant references on table "public"."user_profiles" to "authenticated";

grant select on table "public"."user_profiles" to "authenticated";

grant trigger on table "public"."user_profiles" to "authenticated";

grant truncate on table "public"."user_profiles" to "authenticated";

grant update on table "public"."user_profiles" to "authenticated";

grant delete on table "public"."user_profiles" to "service_role";

grant insert on table "public"."user_profiles" to "service_role";

grant references on table "public"."user_profiles" to "service_role";

grant select on table "public"."user_profiles" to "service_role";

grant trigger on table "public"."user_profiles" to "service_role";

grant truncate on table "public"."user_profiles" to "service_role";

grant update on table "public"."user_profiles" to "service_role";


  create policy "Users can create their own quests"
  on "public"."quests"
  as permissive
  for insert
  to authenticated
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can delete their own quests"
  on "public"."quests"
  as permissive
  for delete
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can update their own quests"
  on "public"."quests"
  as permissive
  for update
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can view their own quests"
  on "public"."quests"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can create tasks in their quests"
  on "public"."tasks"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.quests
  WHERE ((quests.id = tasks.quest_id) AND (quests.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "Users can delete tasks in their quests"
  on "public"."tasks"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.quests
  WHERE ((quests.id = tasks.quest_id) AND (quests.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "Users can update tasks in their quests"
  on "public"."tasks"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.quests
  WHERE ((quests.id = tasks.quest_id) AND (quests.user_id = ( SELECT auth.uid() AS uid))))))
with check ((EXISTS ( SELECT 1
   FROM public.quests
  WHERE ((quests.id = tasks.quest_id) AND (quests.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "Users can view tasks from their quests"
  on "public"."tasks"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.quests
  WHERE ((quests.id = tasks.quest_id) AND (quests.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "Users can insert own profile"
  on "public"."user_profiles"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Users can update own profile"
  on "public"."user_profiles"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can view own profile"
  on "public"."user_profiles"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



