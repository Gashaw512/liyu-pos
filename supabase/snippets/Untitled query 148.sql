SELECT 
    trigger_name, 
    event_object_table AS target_table, 
    action_timing, 
    event_manipulation AS event
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;