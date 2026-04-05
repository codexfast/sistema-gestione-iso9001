require('dotenv').config();
const fs = require('fs'), path = require('path');
const configs = JSON.parse(fs.readFileSync(path.join(__dirname,'..','config','database.json'),'utf8'));
let c = configs.production;
if (process.env.DB_SERVER) c = {...c, server:process.env.DB_SERVER, database:process.env.DB_DATABASE||c.database, user:process.env.DB_USER||c.user, password:process.env.DB_PASSWORD||c.password};
const sql = require('mssql');
sql.connect({server:c.server,port:c.port||1433,database:c.database,user:c.user,password:c.password,options:{trustServerCertificate:true,encrypt:true}}).then(async pool => {
    // Constraint CHECK sulla tabella standards
    const r = await pool.request().query(`
        SELECT cc.name AS constraint_name, cc.definition
        FROM sys.check_constraints cc
        JOIN sys.objects o ON o.object_id = cc.parent_object_id
        WHERE o.name = 'standards'
    `);
    console.log('=== Vincoli CHECK su standards ===');
    r.recordset.forEach(x => console.log(x.constraint_name + ':', x.definition));

    // Valori category esistenti
    const cats = await pool.request().query(`SELECT DISTINCT category FROM standards`);
    console.log('\nValori category esistenti:', cats.recordset.map(x=>x.category));

    await pool.close(); process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
