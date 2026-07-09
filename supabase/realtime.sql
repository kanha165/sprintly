-- Enable Supabase Realtime for tasks and activity_log tables
-- Note: Execute this in Supabase if using the browser Realtime feature.
begin;
  -- remove the tables from publication if they already exist to avoid errors
  alter publication supabase_realtime drop table if exists tasks;
  alter publication supabase_realtime drop table if exists activity_log;

  -- add tables to publication
  alter publication supabase_realtime add table tasks;
  alter publication supabase_realtime add table activity_log;
commit;
