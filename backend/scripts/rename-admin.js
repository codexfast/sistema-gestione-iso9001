require('dotenv').config();
const fs = require('fs'), path = require('path');
const configs = JSON.parse(fs.readFileSync(path.join(__dirname,'..','config','database.json'),'utf8'));
let c = configs.production;
if (process.env.DB_SERVER) c = {...c, server:process.env.DB_SERVER, port:parseInt(process.env.DB_PORT||c.port), database:process.env.DB_DATABASE||c.database, user:process.env.DB_USER||c.user, password:process.env.DB_PASSWORD||c.password};
const sql = require('mssql');
sql.connect({server:c.server,port:c.port||1433,database:c.database,user:c.user,password:c.password,options:{trustServerCertificate:true,encrypt:true}}).then(async pool => {
    await pool.request().input('name', sql.NVarChar, 'PS_Admin').query("UPDATE users SET full_name=@name, updated_at=GETDATE() WHERE email='admin@sgq.local'");
    const r = await pool.request().query("SELECT user_id, email, full_name FROM users WHERE email='admin@sgq.local'");
    console.log('OK:', JSON.stringify(r.recordset[0]));
    await pool.close();
    process.exit(0);
}).catch(e => { console.error('ERR:', e.message); process.exit(1); });
