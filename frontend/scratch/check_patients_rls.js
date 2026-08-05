const token = 'sbp_da59f9d18267a09380a15150f81e28beeef9cd16';
const projectRef = 'bzgaoqtlbwehjhqznzoe';

const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

const sql = `
SELECT 
    tablename, 
    policyname, 
    schemaname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'patients';
`;

fetch(url, {
  method: 'POST',
  headers,
  body: JSON.stringify({ query: sql })
})
  .then(res => res.json())
  .then(data => {
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(err => console.error(err));
