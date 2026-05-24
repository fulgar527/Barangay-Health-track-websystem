module.exports = {
  apps: [{
    name: 'healthtrack',
    script: 'server.js',
    env: {
      SUPABASE_URL: 'https://rfxomnrzlqiopfexnlfx.supabase.co',
      SUPABASE_ANON_KEY: 'sb_publishable_gDKVGPRUV6pYd2qwEPAzzg_nbbV6Y66',
      DATABASE_URL: 'postgresql://postgres:Cuty0urs3lf!@db.rfxomnrzlqiopfexnlfx.supabase.co:5432/postgres',
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
