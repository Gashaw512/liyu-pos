SELECT 
    p.business_id,
    c.name AS category_name,
    SUM((item->>'quantity')::numeric) AS items_sold,
    SUM(((item->>'quantity')::numeric) * ((item->>'unit_price')::numeric)) AS gross_revenue
FROM sales s,
LATERAL jsonb_array_elements(s.items) AS item
JOIN products p ON (item->>'product_id')::uuid = p.id
JOIN categories c ON p.category_id = c.id
GROUP BY p.business_id, c.name;