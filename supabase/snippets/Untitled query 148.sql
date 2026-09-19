SELECT 
    trig.tgname AS trigger_name,
    tbl.relname AS table_name,
    proc.proname AS function_name,
    pg_get_functiondef(proc.oid) AS function_code
FROM pg_trigger trig
JOIN pg_class tbl ON trig.tgrelid = tbl.oid
JOIN pg_proc proc ON trig.tgfoid = proc.oid
WHERE tbl.relnamespace = 'public'::regnamespace -- Change 'public' to 'auth' if looking for auth triggers
  AND trig.tgisinternal = false;
  