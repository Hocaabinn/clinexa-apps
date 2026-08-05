const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6Z2FvcXRsYndlaGpocXpuem9lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5Mjk0MywiZXhwIjoyMDk1OTY4OTQzfQ.bIpZuJDO9zyp1xl_L7gtDtPifmHdtg_UyDywbneAJMs';

fetch('https://bzgaoqtlbwehjhqznzoe.supabase.co/rest/v1/', {
  headers: {
    'apikey': apiKey,
    'Authorization': `Bearer ${apiKey}`
  }
})
  .then(res => res.json())
  .then(data => {
    console.log(JSON.stringify(data.definitions.record_access_grants, null, 2));
  })
  .catch(err => console.error(err));
